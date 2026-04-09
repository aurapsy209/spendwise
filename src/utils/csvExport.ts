import type { Expense } from '../types';
import { getCategoryById } from './categories';
import { formatDate } from './formatters';
import { formatWithCurrency } from './currencies';

/**
 * Convert expenses to CSV string
 */
export const expensesToCSV = (expenses: Expense[]): string => {
  const headers = ['Date', 'Description', 'Category', 'Amount', 'Notes'];

  const rows = expenses.map((expense) => {
    const category = getCategoryById(expense.categoryId);
    return [
      formatDate(expense.date),
      `"${expense.description.replace(/"/g, '""')}"`,
      category.name,
      expense.amount.toFixed(2),
      `"${(expense.notes || '').replace(/"/g, '""')}"`,
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
};

/**
 * Download data as a file
 */
export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export expenses as CSV file
 */
export const exportExpensesCSV = (expenses: Expense[], filename = 'expenses.csv'): void => {
  const csv = expensesToCSV(expenses);
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
};

/**
 * Export data as JSON file
 */
export const exportDataJSON = (data: unknown, filename = 'spendwise-backup.json'): void => {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, filename, 'application/json');
};

interface CategoryRow {
  name: string;
  icon: string;
  amount: number;
  percentage: number;
}

/**
 * Export expenses as a styled PDF report via the browser print dialog.
 * Opens a new window with a formatted HTML report and triggers window.print().
 */
export const exportExpensesPDF = (
  expenses: Expense[],
  categoryBreakdown: CategoryRow[],
  homeCurrency: string,
  periodLabel: string
): void => {
  const totalAmount = expenses.reduce((s, e) => s + e.amount * (e.exchangeRate ?? 1), 0);
  const generatedOn = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Build category rows HTML
  const categoryRows = categoryBreakdown.map((c) => `
    <tr>
      <td>${c.icon} ${c.name}</td>
      <td class="right">${formatWithCurrency(c.amount, homeCurrency)}</td>
      <td class="right">${c.percentage.toFixed(1)}%</td>
    </tr>
  `).join('');

  // Build expense rows HTML (sorted by date desc)
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const expenseRows = sorted.map((e) => {
    const cat = getCategoryById(e.categoryId);
    const catName = e.categoryId === 'other' && e.customCategory ? e.customCategory : cat.name;
    const homeAmt = e.amount * (e.exchangeRate ?? 1);
    const foreignNote = e.currency && e.currency !== homeCurrency
      ? ` <span class="foreign">(${e.currency} ${e.amount.toFixed(2)})</span>`
      : '';
    return `
      <tr>
        <td>${formatDate(e.date)}</td>
        <td>${e.description}${e.notes ? `<br><span class="note">${e.notes}</span>` : ''}</td>
        <td>${cat.icon} ${catName}</td>
        <td class="right">${formatWithCurrency(homeAmt, homeCurrency)}${foreignNote}</td>
      </tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>SpendWise Report — ${periodLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: #fff; padding: 32px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #6366f1; padding-bottom: 16px; }
    .brand { font-size: 22px; font-weight: 800; color: #6366f1; }
    .brand span { color: #1e293b; }
    .meta { text-align: right; color: #64748b; font-size: 12px; line-height: 1.6; }
    .period { font-size: 15px; font-weight: 600; color: #1e293b; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
    .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
    .stat-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 20px; font-weight: 700; color: #1e293b; margin-top: 4px; }
    .stat-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    h2 { font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 12px; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead th { background: #6366f1; color: #fff; padding: 8px 12px; text-align: left; font-weight: 600; }
    thead th.right { text-align: right; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody td { padding: 7px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    td.right { text-align: right; white-space: nowrap; }
    .note { color: #94a3b8; font-size: 11px; }
    .foreign { color: #94a3b8; font-size: 11px; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; text-align: center; }
    @media print {
      body { padding: 20px; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Spend<span>Wise</span></div>
      <div class="period">${periodLabel}</div>
    </div>
    <div class="meta">
      <div>Generated: ${generatedOn}</div>
      <div>${expenses.length} transactions</div>
    </div>
  </div>

  <div class="summary">
    <div class="stat">
      <div class="stat-label">Total Spent</div>
      <div class="stat-value">${formatWithCurrency(totalAmount, homeCurrency)}</div>
      <div class="stat-sub">${homeCurrency} equivalent</div>
    </div>
    <div class="stat">
      <div class="stat-label">Transactions</div>
      <div class="stat-value">${expenses.length}</div>
      <div class="stat-sub">avg ${expenses.length > 0 ? formatWithCurrency(totalAmount / expenses.length, homeCurrency) : '—'} each</div>
    </div>
    <div class="stat">
      <div class="stat-label">Categories</div>
      <div class="stat-value">${categoryBreakdown.length}</div>
      <div class="stat-sub">spending categories</div>
    </div>
  </div>

  ${categoryBreakdown.length > 0 ? `
  <h2>Spending by Category</h2>
  <table>
    <thead><tr><th>Category</th><th class="right">Amount</th><th class="right">% of Total</th></tr></thead>
    <tbody>${categoryRows}</tbody>
  </table>` : ''}

  ${expenses.length > 0 ? `
  <h2>All Transactions</h2>
  <table>
    <thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="right">Amount</th></tr></thead>
    <tbody>${expenseRows}</tbody>
  </table>` : '<p style="color:#94a3b8;margin-top:24px">No transactions in this period.</p>'}

  <div class="footer">SpendWise — Expense Tracker &nbsp;·&nbsp; ${generatedOn}</div>

  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};
