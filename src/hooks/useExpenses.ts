import { useReducer, useEffect, useCallback, useMemo, useState } from 'react';
import type { AppState, AppAction, Expense, Budget, CategoryId, RecurringExpense } from '../types';
import {
  supabase,
  toExpense,
  toBudget,
  toDbExpense,
  toDbBudget,
  toRecurringExpense,
  toDbRecurringExpense,
} from '../lib/supabase';
import { currentYearMonth } from '../utils/formatters';
import {
  filterExpensesByMonth,
  calculateSummary,
  calculateBudgetStatus,
  sortExpensesByDate,
} from '../utils/expenseHelpers';
import { DEFAULT_CURRENCY } from '../utils/currencies';

const initialState: AppState = {
  expenses: [],
  budgets: [],
  activeView: 'dashboard',
  viewPeriod: 'monthly',
  selectedMonth: currentYearMonth(),
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_EXPENSE':
      return { ...state, expenses: [...state.expenses, action.payload] };

    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };

    case 'DELETE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.payload),
      };

    case 'BULK_ADD_EXPENSES':
      return { ...state, expenses: [...state.expenses, ...action.payload] };

    case 'BULK_REMOVE_EXPENSES':
      return {
        ...state,
        expenses: state.expenses.filter((e) => !action.payload.includes(e.id)),
      };

    case 'SET_BUDGET': {
      const exists = state.budgets.find((b) => b.categoryId === action.payload.categoryId);
      if (exists) {
        return {
          ...state,
          budgets: state.budgets.map((b) =>
            b.categoryId === action.payload.categoryId ? action.payload : b
          ),
        };
      }
      return { ...state, budgets: [...state.budgets, action.payload] };
    }

    case 'DELETE_BUDGET':
      return {
        ...state,
        budgets: state.budgets.filter((b) => b.categoryId !== action.payload),
      };

    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: action.payload };

    case 'SET_VIEW_PERIOD':
      return { ...state, viewPeriod: action.payload };

    case 'SET_SELECTED_MONTH':
      return { ...state, selectedMonth: action.payload };

    case 'IMPORT_DATA':
      return {
        ...state,
        expenses: action.payload.expenses,
        budgets: action.payload.budgets,
      };

    default:
      return state;
  }
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function advanceDueDate(date: string, frequency: RecurringExpense['frequency']): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  switch (frequency) {
    case 'daily':   dt.setDate(dt.getDate() + 1); break;
    case 'weekly':  dt.setDate(dt.getDate() + 7); break;
    case 'monthly': dt.setMonth(dt.getMonth() + 1); break;
    case 'yearly':  dt.setFullYear(dt.getFullYear() + 1); break;
  }
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function useExpenses(userId: string) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [listMonthFilter, setListMonthFilter] = useState<string | null>(null);
  const [homeCurrency, setHomeCurrencyState] = useState<string>(DEFAULT_CURRENCY);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);

  // Load all data from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      supabase.from('expenses').select('*').eq('user_id', userId),
      supabase.from('budgets').select('*').eq('user_id', userId),
      supabase.from('user_categories').select('name').eq('user_id', userId).order('created_at'),
      supabase.from('user_settings').select('home_currency').eq('user_id', userId).single(),
      supabase.from('recurring_expenses').select('*').eq('user_id', userId),
    ]).then(async ([expensesRes, budgetsRes, categoriesRes, settingsRes, recurringRes]) => {
      if (cancelled) return;

      const expenses = (expensesRes.data ?? []).map(toExpense);
      const budgets = (budgetsRes.data ?? []).map(toBudget);
      const categories = (categoriesRes.data ?? []).map((r: { name: string }) => r.name);
      const home = settingsRes.data?.home_currency ?? DEFAULT_CURRENCY;
      let recurring = (recurringRes.data ?? []).map(toRecurringExpense);

      dispatch({ type: 'IMPORT_DATA', payload: { expenses, budgets } });
      setUserCategories(categories);
      setHomeCurrencyState(home);

      // Auto-generate overdue recurring expenses
      const today = todayString();
      const newExpenses: Expense[] = [];
      const updatedRecurring: RecurringExpense[] = [];

      for (const r of recurring) {
        if (!r.isActive) {
          updatedRecurring.push(r);
          continue;
        }
        let next = r.nextDueDate;
        let iters = 0;
        while (next <= today && iters < 365) {
          iters++;
          const expense: Expense = {
            id: crypto.randomUUID(),
            amount: r.amount,
            currency: r.currency,
            exchangeRate: r.exchangeRate,
            categoryId: r.categoryId,
            customCategory: r.customCategory,
            description: r.description,
            notes: r.notes,
            date: next,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          newExpenses.push(expense);
          next = advanceDueDate(next, r.frequency);
        }
        updatedRecurring.push({ ...r, nextDueDate: next });
      }

      if (newExpenses.length > 0) {
        for (const e of newExpenses) {
          dispatch({ type: 'ADD_EXPENSE', payload: e });
          await supabase.from('expenses').insert(toDbExpense(e, userId));
        }
        for (const r of updatedRecurring) {
          if (r.nextDueDate !== recurring.find((x) => x.id === r.id)?.nextDueDate) {
            await supabase
              .from('recurring_expenses')
              .update({ next_due_date: r.nextDueDate })
              .eq('id', r.id);
          }
        }
        recurring = updatedRecurring;
      }

      setRecurringExpenses(recurring);
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const addExpense = useCallback(
    async (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
      const expense: Expense = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_EXPENSE', payload: expense });
      const { error } = await supabase.from('expenses').insert(toDbExpense(expense, userId));
      if (error) {
        console.error('Failed to save expense:', error.message);
        dispatch({ type: 'DELETE_EXPENSE', payload: expense.id });
      }
    },
    [userId]
  );

  const addExpensesBulk = useCallback(
    async (rows: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>[]) => {
      const expenses: Expense[] = rows.map((data) => ({
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      dispatch({ type: 'BULK_ADD_EXPENSES', payload: expenses });
      const { error } = await supabase
        .from('expenses')
        .insert(expenses.map((e) => toDbExpense(e, userId)));
      if (error) {
        console.error('Failed to bulk save expenses:', error.message);
        dispatch({ type: 'BULK_REMOVE_EXPENSES', payload: expenses.map((e) => e.id) });
        throw error;
      }
    },
    [userId]
  );

  const updateExpense = useCallback(
    async (id: string, data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
      const existing = state.expenses.find((e) => e.id === id);
      if (!existing) return;
      const updated: Expense = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
      dispatch({ type: 'UPDATE_EXPENSE', payload: updated });
      const { error } = await supabase
        .from('expenses')
        .update(toDbExpense(updated, userId))
        .eq('id', id)
        .eq('user_id', userId);
      if (error) {
        console.error('Failed to update expense:', error.message);
        dispatch({ type: 'UPDATE_EXPENSE', payload: existing });
      }
    },
    [state.expenses, userId]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      const existing = state.expenses.find((e) => e.id === id);
      dispatch({ type: 'DELETE_EXPENSE', payload: id });
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error && existing) {
        console.error('Failed to delete expense:', error.message);
        dispatch({ type: 'ADD_EXPENSE', payload: existing });
      }
    },
    [state.expenses, userId]
  );

  const setBudget = useCallback(
    async (budget: Budget) => {
      dispatch({ type: 'SET_BUDGET', payload: budget });
      const { error } = await supabase
        .from('budgets')
        .upsert(toDbBudget(budget, userId), { onConflict: 'user_id,category_id' });
      if (error) console.error('Failed to save budget:', error.message);
    },
    [userId]
  );

  const deleteBudget = useCallback(
    async (categoryId: CategoryId) => {
      dispatch({ type: 'DELETE_BUDGET', payload: categoryId });
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', userId)
        .eq('category_id', categoryId);
      if (error) console.error('Failed to delete budget:', error.message);
    },
    [userId]
  );

  const addUserCategory = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || userCategories.includes(trimmed)) return;
      setUserCategories((prev) => [...prev, trimmed]);
      const { error } = await supabase.from('user_categories').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        name: trimmed,
        created_at: new Date().toISOString(),
      });
      if (error) {
        console.error('Failed to save custom category:', error.message);
        setUserCategories((prev) => prev.filter((c) => c !== trimmed));
      }
    },
    [userId, userCategories]
  );

  const setHomeCurrency = useCallback(
    async (currency: string) => {
      setHomeCurrencyState(currency);
      const { error } = await supabase.from('user_settings').upsert(
        { user_id: userId, home_currency: currency, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
      if (error) console.error('Failed to save home currency:', error.message);
    },
    [userId]
  );

  const addRecurringExpense = useCallback(
    async (data: Omit<RecurringExpense, 'id' | 'createdAt'>) => {
      const r: RecurringExpense = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setRecurringExpenses((prev) => [...prev, r]);
      const { error } = await supabase
        .from('recurring_expenses')
        .insert(toDbRecurringExpense(r, userId));
      if (error) {
        console.error('Failed to save recurring expense:', error.message);
        setRecurringExpenses((prev) => prev.filter((x) => x.id !== r.id));
      }
    },
    [userId]
  );

  const toggleRecurringExpense = useCallback(
    async (id: string) => {
      setRecurringExpenses((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
      );
      const target = recurringExpenses.find((r) => r.id === id);
      if (!target) return;
      const { error } = await supabase
        .from('recurring_expenses')
        .update({ is_active: !target.isActive })
        .eq('id', id);
      if (error) console.error('Failed to toggle recurring expense:', error.message);
    },
    [recurringExpenses]
  );

  const deleteRecurringExpense = useCallback(
    async (id: string) => {
      const existing = recurringExpenses.find((r) => r.id === id);
      setRecurringExpenses((prev) => prev.filter((r) => r.id !== id));
      const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error && existing) {
        console.error('Failed to delete recurring expense:', error.message);
        setRecurringExpenses((prev) => [...prev, existing]);
      }
    },
    [recurringExpenses, userId]
  );

  const setActiveView = useCallback((view: AppState['activeView']) => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
  }, []);

  const setViewPeriod = useCallback((period: AppState['viewPeriod']) => {
    dispatch({ type: 'SET_VIEW_PERIOD', payload: period });
  }, []);

  const setSelectedMonth = useCallback((month: string) => {
    dispatch({ type: 'SET_SELECTED_MONTH', payload: month });
  }, []);

  const importData = useCallback(
    async (expenses: Expense[], budgets: Budget[]) => {
      dispatch({ type: 'IMPORT_DATA', payload: { expenses, budgets } });
      await Promise.all([
        supabase.from('expenses').insert(expenses.map((e) => toDbExpense(e, userId))),
        supabase
          .from('budgets')
          .upsert(budgets.map((b) => toDbBudget(b, userId)), { onConflict: 'user_id,category_id' }),
      ]);
    },
    [userId]
  );

  // ─── Derived data ──────────────────────────────────────────────────────────

  const currentMonthExpenses = useMemo(
    () => filterExpensesByMonth(state.expenses, state.selectedMonth),
    [state.expenses, state.selectedMonth]
  );

  const sortedCurrentMonthExpenses = useMemo(
    () => sortExpensesByDate(currentMonthExpenses),
    [currentMonthExpenses]
  );

  const allExpensesSorted = useMemo(
    () => sortExpensesByDate(state.expenses),
    [state.expenses]
  );

  const currentMonthSummary = useMemo(
    () => calculateSummary(currentMonthExpenses),
    [currentMonthExpenses]
  );

  const budgetStatuses = useMemo(
    () => calculateBudgetStatus(state.budgets, state.expenses, state.selectedMonth),
    [state.budgets, state.expenses, state.selectedMonth]
  );

  const totalBudget = useMemo(
    () => state.budgets.reduce((sum, b) => sum + b.amount, 0),
    [state.budgets]
  );

  return {
    state,
    isLoading,
    homeCurrency,
    userCategories,
    listMonthFilter,
    recurringExpenses,
    setListMonthFilter,
    // Actions
    setHomeCurrency,
    addUserCategory,
    addExpense,
    addExpensesBulk,
    updateExpense,
    deleteExpense,
    setBudget,
    deleteBudget,
    setActiveView,
    setViewPeriod,
    setSelectedMonth,
    importData,
    addRecurringExpense,
    toggleRecurringExpense,
    deleteRecurringExpense,
    // Derived
    currentMonthExpenses,
    sortedCurrentMonthExpenses,
    allExpensesSorted,
    currentMonthSummary,
    budgetStatuses,
    totalBudget,
  };
}
