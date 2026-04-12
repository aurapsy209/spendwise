import type { ParsedTransaction } from '../types/import';

/**
 * Normalise a date to YYYY-MM-DD.
 * Handles common bank statement date formats:
 *   MM/DD/YYYY  DD/MM/YYYY  YYYY-MM-DD
 *   DD Mon YYYY  Mon DD YYYY  DD Mon  Mon DD (current year assumed)
 */
function normaliseDate(raw: string): string | null {
  raw = raw.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // MM/DD/YYYY or DD/MM/YYYY — treat as MM/DD/YYYY (US convention)
  const slashFull = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashFull) {
    const [, a, b, y] = slashFull;
    return `${y}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
  }

  // MM/DD or DD/MM without year — assume current year
  const slashShort = raw.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashShort) {
    const year = new Date().getFullYear();
    const [, a, b] = slashShort;
    return `${year}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
  }

  const MONTHS: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  // DD Mon YYYY or Mon DD YYYY (month name may be 3+ letters)
  const longDate = raw.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/) ||
                   raw.match(/^([A-Za-z]{3,9})\s+(\d{1,2})\s+(\d{4})$/);
  if (longDate) {
    const parts = longDate.slice(1);
    let day: string, mon: string, year: string;
    if (/^\d/.test(parts[0])) { [day, mon, year] = parts; }
    else                       { [mon, day, year] = parts; }
    const m = MONTHS[mon.slice(0, 3).toLowerCase()];
    if (m) return `${year}-${m}-${day.padStart(2, '0')}`;
  }

  // DD Mon or Mon DD (no year — assume current year)
  const shortDate = raw.match(/^(\d{1,2})\s+([A-Za-z]{3})$/) ||
                    raw.match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
  if (shortDate) {
    const parts = shortDate.slice(1);
    let day: string, mon: string;
    if (/^\d/.test(parts[0])) { [day, mon] = parts; }
    else                      { [mon, day] = parts; }
    const m = MONTHS[mon.toLowerCase()];
    const year = new Date().getFullYear();
    if (m) return `${year}-${m}-${day.padStart(2, '0')}`;
  }

  return null;
}

/** Parse a raw amount string like "$1,234.56", "1.234,56", "-50.00" → positive number.
 *  Returns null for negative amounts (credits/payments) so they are skipped. */
function parseAmount(raw: string): number | null {
  const isNegative = raw.trim().startsWith('-');
  if (isNegative) return null; // skip credits and payments

  // Remove currency symbols, spaces, DR/CR suffixes
  let s = raw.replace(/[£€$¥₹\s-]/g, '').replace(/\b(DR|CR|debit|credit)\b/gi, '').trim();
  // Handle European format: 1.234,56 → 1234.56
  if (/^\d{1,3}(\.\d{3})+(,\d{2})?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, ''); // remove thousands separators
  }
  const n = parseFloat(s);
  if (isNaN(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/** Lines that are almost certainly NOT transactions */
const NOISE_PATTERNS = [
  /opening balance/i,
  /closing balance/i,
  /available balance/i,
  /account balance/i,
  /balance brought/i,
  /balance carried/i,
  /total (debit|credit|payments|deposits)/i,
  /^(date|description|details|particulars|narrative|reference|amount|debit|credit|balance)\b/i,
  /account (number|no\.?|holder)/i,
  /sort code/i,
  /statement (period|date|number)/i,
  /page \d+/i,
  /^\d{4}$/, // bare year
  /direct debit guarantee/i,
  /brought forward/i,
  /carried forward/i,
  /payment.*(thank you|received|credit)/i,
  /thank you.*payment/i,
  /payments and other credits/i,
  /purchase$/i,
  /interest charges/i,
  /fees charged/i,
  /minimum payment/i,
  /new balance/i,
  /previous balance/i,
  /cash advance/i,
  /balance transfer/i,
  /year.to.date/i,
  /annual percentage/i,
];

function isNoiseLine(line: string): boolean {
  return NOISE_PATTERNS.some((p) => p.test(line.trim()));
}

/**
 * DATE_AMOUNT_RE matches lines that contain BOTH a recognisable date fragment
 * and a numeric amount somewhere on the line.
 *
 * Strategy: find candidate tokens for date and amount, then everything in
 * between (plus trailing text before the amount) is the description.
 */

// A loose date pattern that matches the formats we support
const DATE_RE =
  /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{4})?|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s+\d{4})?|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:\s+\d{4})?)\b/i;

// A loose amount pattern: optional sign, optional currency symbol, digits, optional decimals
const AMOUNT_RE = /-?[£€$¥₹]?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})(?:\s*(?:DR|CR))?\b/gi;

interface RawRow {
  date: string;
  description: string;
  amount: number;
}

function extractRows(text: string): RawRow[] {
  const rows: RawRow[] = [];
  const lines = text.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || isNoiseLine(line)) continue;

    // Must contain a date
    const dateMatch = line.match(DATE_RE);
    if (!dateMatch) continue;

    const dateStr = normaliseDate(dateMatch[1]);
    if (!dateStr) continue;

    // Collect all amount candidates
    const amounts: Array<{ raw: string; index: number }> = [];
    let m: RegExpExecArray | null;
    const amtRe = new RegExp(AMOUNT_RE.source, 'gi');
    while ((m = amtRe.exec(line)) !== null) {
      amounts.push({ raw: m[0], index: m.index });
    }
    if (amounts.length === 0) continue;

    // Use the LAST amount on the line (usually debit column)
    const lastAmt = amounts[amounts.length - 1];
    const amount = parseAmount(lastAmt.raw);
    if (!amount) continue;

    // Description = text between end of date match and start of last amount,
    // stripped of other amount tokens
    const dateEnd = (dateMatch.index ?? 0) + dateMatch[0].length;
    let desc = line
      .slice(dateEnd, lastAmt.index)
      .trim()
      // Remove any intermediate amounts
      .replace(new RegExp(AMOUNT_RE.source, 'gi'), '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // If description is empty, try text before the date
    if (!desc) {
      desc = line.slice(0, dateMatch.index ?? 0).trim();
    }
    if (!desc) desc = 'Unknown';

    // Clean up common reference noise at end of description
    desc = desc
      .replace(/\s+(ref|txn|trn|trans|id|no\.?|#)\s*[\w-]+$/i, '')
      .replace(/[*]+\d+\s*$/, '')
      .trim();

    if (desc.length < 2) continue;

    rows.push({ date: dateStr, description: desc, amount });
  }

  return rows;
}

/**
 * Parse raw PDF text extracted by pdfjs into an array of ParsedTransaction.
 * All transactions default to categoryId 'other' — user assigns categories
 * in the review table.
 */
export function parseBankStatement(
  text: string,
  currency = 'USD'
): ParsedTransaction[] {
  const rows = extractRows(text);

  return rows.map((r) => ({
    date: r.date,
    description: r.description,
    amount: r.amount,
    currency,
    categoryId: 'other' as const,
  }));
}

/**
 * Returns true if the extracted text is likely from a scanned/image PDF
 * (very little actual text content).
 */
export function isScannedPDF(text: string): boolean {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return wordCount < 50;
}
