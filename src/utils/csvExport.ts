import type { Expense } from '../types';
import { getCategoryById } from './categories';
import { formatDate } from './formatters';

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
