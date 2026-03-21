import type { Expense, Budget } from '../types';

const EXPENSES_KEY = 'spendwise_expenses';
const BUDGETS_KEY = 'spendwise_budgets';

export const storage = {
  getExpenses(): Expense[] {
    try {
      const raw = localStorage.getItem(EXPENSES_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as Expense[];
    } catch {
      return [];
    }
  },

  saveExpenses(expenses: Expense[]): void {
    try {
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    } catch (e) {
      console.error('Failed to save expenses:', e);
    }
  },

  getBudgets(): Budget[] {
    try {
      const raw = localStorage.getItem(BUDGETS_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as Budget[];
    } catch {
      return [];
    }
  },

  saveBudgets(budgets: Budget[]): void {
    try {
      localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
    } catch (e) {
      console.error('Failed to save budgets:', e);
    }
  },

  clearAll(): void {
    localStorage.removeItem(EXPENSES_KEY);
    localStorage.removeItem(BUDGETS_KEY);
  },

  exportData(): string {
    const expenses = storage.getExpenses();
    const budgets = storage.getBudgets();
    return JSON.stringify({ expenses, budgets }, null, 2);
  },

  importData(jsonString: string): { expenses: Expense[]; budgets: Budget[] } | null {
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data.expenses) || !Array.isArray(data.budgets)) {
        return null;
      }
      return data as { expenses: Expense[]; budgets: Budget[] };
    } catch {
      return null;
    }
  },
};
