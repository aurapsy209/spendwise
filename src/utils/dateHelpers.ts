import { toDateString } from './formatters';
import type { Expense } from '../types';

/**
 * Get daily totals for a list of date strings
 */
export const getDailyTotals = (
  expenses: Expense[],
  days: string[]
): Array<{ date: string; amount: number }> => {
  return days.map((date) => {
    const total = expenses
      .filter((e) => e.date === date)
      .reduce((sum, e) => sum + e.amount, 0);
    return { date, amount: total };
  });
};

/**
 * Get the start of the current week (Monday)
 */
export const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get the end of the current week (Sunday)
 */
export const getWeekEnd = (date: Date = new Date()): Date => {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

/**
 * Get the start of a month
 */
export const getMonthStart = (yearMonth: string): Date => {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
};

/**
 * Get the end of a month
 */
export const getMonthEnd = (yearMonth: string): Date => {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month, 0, 23, 59, 59, 999);
};

/**
 * Check if a date string is within a given range
 */
export const isDateInRange = (dateStr: string, start: Date, end: Date): boolean => {
  const date = new Date(dateStr + 'T00:00:00');
  return date >= start && date <= end;
};

/**
 * Get all days in a month as YYYY-MM-DD strings
 */
export const getDaysInMonth = (yearMonth: string): string[] => {
  const start = getMonthStart(yearMonth);
  const end = getMonthEnd(yearMonth);
  const days: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(toDateString(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};

/**
 * Get last N months as YYYY-MM strings
 */
export const getLastNMonths = (n: number): string[] => {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
};

/**
 * Get today as YYYY-MM-DD
 */
export const getTodayString = (): string => {
  return toDateString(new Date());
};

/**
 * Get previous month string
 */
export const getPreviousMonth = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-').map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Get next month string
 */
export const getNextMonth = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-').map(Number);
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Check if a month string is the current month
 */
export const isCurrentMonth = (yearMonth: string): boolean => {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return yearMonth === current;
};

/**
 * Get week number strings for display (e.g., last 7 days)
 */
export const getLastNDays = (n: number): string[] => {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toDateString(d));
  }
  return days;
};
