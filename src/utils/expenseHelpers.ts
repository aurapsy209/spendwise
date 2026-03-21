import type { Expense, Budget, BudgetStatus, CategoryId, ExpenseSummary } from '../types';
import { CATEGORIES, getCategoryById } from './categories';
import { getMonthStart, getMonthEnd, isDateInRange } from './dateHelpers';

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Filter expenses by month
 */
export const filterExpensesByMonth = (expenses: Expense[], yearMonth: string): Expense[] => {
  const start = getMonthStart(yearMonth);
  const end = getMonthEnd(yearMonth);
  return expenses.filter((e) => isDateInRange(e.date, start, end));
};

/**
 * Filter expenses by date range
 */
export const filterExpensesByDateRange = (
  expenses: Expense[],
  start: Date,
  end: Date
): Expense[] => {
  return expenses.filter((e) => isDateInRange(e.date, start, end));
};

/**
 * Filter expenses by a single day
 */
export const filterExpensesByDay = (expenses: Expense[], dateStr: string): Expense[] => {
  return expenses.filter((e) => e.date === dateStr);
};

/**
 * Calculate expense summary
 */
export const calculateSummary = (expenses: Expense[]): ExpenseSummary => {
  const byCategory: Record<string, number> = {};
  const byDate: Record<string, number> = {};

  CATEGORIES.forEach((c) => {
    byCategory[c.id] = 0;
  });

  let total = 0;

  for (const expense of expenses) {
    total += expense.amount;
    byCategory[expense.categoryId] = (byCategory[expense.categoryId] || 0) + expense.amount;
    byDate[expense.date] = (byDate[expense.date] || 0) + expense.amount;
  }

  return {
    total,
    count: expenses.length,
    byCategory: byCategory as Record<CategoryId, number>,
    byDate,
  };
};

/**
 * Calculate budget status for a given month
 */
export const calculateBudgetStatus = (
  budgets: Budget[],
  expenses: Expense[],
  yearMonth: string
): BudgetStatus[] => {
  const monthExpenses = filterExpensesByMonth(expenses, yearMonth);
  const summary = calculateSummary(monthExpenses);

  return budgets.map((budget) => {
    const spentAmount = summary.byCategory[budget.categoryId] || 0;
    const remaining = budget.amount - spentAmount;
    const percentage = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;

    return {
      categoryId: budget.categoryId,
      budgetAmount: budget.amount,
      spentAmount,
      remaining,
      percentage,
      isOverBudget: spentAmount > budget.amount,
    };
  });
};

/**
 * Sort expenses by date descending
 */
export const sortExpensesByDate = (expenses: Expense[]): Expense[] => {
  return [...expenses].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.createdAt.localeCompare(a.createdAt);
  });
};

/**
 * Get top spending categories
 */
export const getTopCategories = (
  expenses: Expense[],
  limit = 5
): Array<{ categoryId: CategoryId; amount: number }> => {
  const summary = calculateSummary(expenses);
  return Object.entries(summary.byCategory)
    .map(([categoryId, amount]) => ({ categoryId: categoryId as CategoryId, amount }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
};


// Colors cycled through for custom categories
const CUSTOM_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#0ea5e9', '#84cc16', '#f43f5e', '#d946ef', '#fb923c'];

function customCategoryColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return CUSTOM_COLORS[Math.abs(hash) % CUSTOM_COLORS.length];
}

export interface ChartCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
}

/**
 * Build chart-ready category data, splitting custom categories into their own entries.
 */
export function buildCategoryChartData(expenses: Expense[]): ChartCategory[] {
  const entries: Record<string, { name: string; icon: string; color: string; amount: number }> = {};
  let total = 0;

  for (const expense of expenses) {
    total += expense.amount;
    if (expense.categoryId === 'other' && expense.customCategory?.trim()) {
      const key = `custom:${expense.customCategory}`;
      if (!entries[key]) {
        entries[key] = {
          name: expense.customCategory,
          icon: '🏷️',
          color: customCategoryColor(expense.customCategory),
          amount: 0,
        };
      }
      entries[key].amount += expense.amount;
    } else {
      const cat = getCategoryById(expense.categoryId);
      if (!entries[expense.categoryId]) {
        entries[expense.categoryId] = { name: cat.name, icon: cat.icon, color: cat.color, amount: 0 };
      }
      entries[expense.categoryId].amount += expense.amount;
    }
  }

  return Object.entries(entries)
    .map(([id, data]) => ({
      id,
      ...data,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
    }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Calculate percentage change between two values
 */
export const percentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Get sample/demo expenses for first-time users
 */
export const getSampleExpenses = (): Expense[] => {
  const makeExpense = (
    daysAgo: number,
    amount: number,
    categoryId: CategoryId,
    description: string,
    notes = ''
  ): Expense => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      id: generateId(),
      amount,
      categoryId,
      description,
      date: dateStr,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  return [
    makeExpense(0, 12.5, 'food', 'Morning coffee & bagel'),
    makeExpense(1, 45.0, 'food', 'Weekly groceries', 'Trader Joes'),
    makeExpense(1, 4.5, 'transport', 'Bus fare'),
    makeExpense(2, 15.99, 'entertainment', 'Netflix subscription'),
    makeExpense(2, 8.75, 'food', 'Lunch at deli'),
    makeExpense(3, 120.0, 'bills', 'Electric bill'),
    makeExpense(4, 35.0, 'shopping', 'Amazon order'),
    makeExpense(4, 22.0, 'food', 'Dinner with friends'),
    makeExpense(5, 50.0, 'fitness', 'Gym membership'),
    makeExpense(6, 18.5, 'transport', 'Uber ride'),
    makeExpense(7, 95.0, 'healthcare', 'Pharmacy'),
    makeExpense(8, 200.0, 'bills', 'Internet bill'),
    makeExpense(9, 30.0, 'entertainment', 'Movie tickets x2'),
    makeExpense(10, 67.5, 'food', 'Grocery run'),
    makeExpense(11, 12.0, 'food', 'Coffee shop'),
    makeExpense(12, 150.0, 'shopping', 'Clothing'),
    makeExpense(13, 25.0, 'transport', 'Gas station'),
    makeExpense(14, 8.99, 'entertainment', 'Spotify premium'),
    makeExpense(15, 45.0, 'food', 'Restaurant dinner'),
    makeExpense(16, 350.0, 'bills', 'Rent partial'),
    makeExpense(18, 20.0, 'education', 'Online course'),
    makeExpense(20, 55.0, 'food', 'Weekly groceries'),
    makeExpense(22, 180.0, 'travel', 'Train tickets'),
    makeExpense(25, 14.0, 'food', 'Lunch'),
    makeExpense(28, 75.0, 'shopping', 'Home supplies'),
  ];
};
