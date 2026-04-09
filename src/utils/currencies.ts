export interface Currency {
  code: string;
  symbol: string;
  name: string;
  rateToUSD: number; // approximate static rate
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$',    name: 'US Dollar',           rateToUSD: 1 },
  { code: 'EUR', symbol: '€',    name: 'Euro',                rateToUSD: 0.92 },
  { code: 'GBP', symbol: '£',    name: 'British Pound',       rateToUSD: 0.79 },
  { code: 'JPY', symbol: '¥',    name: 'Japanese Yen',        rateToUSD: 149.5 },
  { code: 'CAD', symbol: 'CA$',  name: 'Canadian Dollar',     rateToUSD: 1.36 },
  { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar',   rateToUSD: 1.53 },
  { code: 'CHF', symbol: 'Fr',   name: 'Swiss Franc',         rateToUSD: 0.90 },
  { code: 'CNY', symbol: '¥',    name: 'Chinese Yuan',        rateToUSD: 7.24 },
  { code: 'INR', symbol: '₹',    name: 'Indian Rupee',        rateToUSD: 83.1 },
  { code: 'MXN', symbol: 'MX$',  name: 'Mexican Peso',        rateToUSD: 17.15 },
  { code: 'BRL', symbol: 'R$',   name: 'Brazilian Real',      rateToUSD: 4.97 },
  { code: 'KRW', symbol: '₩',    name: 'South Korean Won',    rateToUSD: 1325 },
  { code: 'SGD', symbol: 'S$',   name: 'Singapore Dollar',    rateToUSD: 1.34 },
  { code: 'HKD', symbol: 'HK$',  name: 'Hong Kong Dollar',    rateToUSD: 7.82 },
  { code: 'NOK', symbol: 'kr',   name: 'Norwegian Krone',     rateToUSD: 10.6 },
  { code: 'SEK', symbol: 'kr',   name: 'Swedish Krona',       rateToUSD: 10.5 },
  { code: 'NZD', symbol: 'NZ$',  name: 'New Zealand Dollar',  rateToUSD: 1.63 },
  { code: 'AED', symbol: 'د.إ',  name: 'UAE Dirham',          rateToUSD: 3.67 },
  { code: 'SAR', symbol: '﷼',    name: 'Saudi Riyal',         rateToUSD: 3.75 },
  { code: 'ZAR', symbol: 'R',    name: 'South African Rand',  rateToUSD: 18.6 },
];

export const DEFAULT_CURRENCY = 'USD';

export function getCurrency(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/** Format an amount using the browser's Intl API with fallback */
export function formatWithCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const curr = getCurrency(currencyCode);
    return `${curr.symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Convert an amount from one currency to another using static rates.
 * exchangeRate (stored on expense) = units of home currency per 1 unit of expense currency.
 */
export function convertAmount(amount: number, fromCode: string, toCode: string): number {
  if (fromCode === toCode) return amount;
  const from = getCurrency(fromCode);
  const to = getCurrency(toCode);
  const usd = amount / from.rateToUSD;
  return usd * to.rateToUSD;
}

/** Get the default exchange rate: how many `homeCurrency` per 1 `foreignCurrency` */
export function getDefaultRate(foreignCode: string, homeCode: string): number {
  if (foreignCode === homeCode) return 1;
  return convertAmount(1, foreignCode, homeCode);
}
