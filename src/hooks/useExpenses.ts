import { useReducer, useEffect, useCallback, useMemo, useState } from 'react';
import type { AppState, AppAction, Expense, Budget, CategoryId } from '../types';
import { supabase, toExpense, toBudget, toDbExpense, toDbBudget } from '../lib/supabase';
import { currentYearMonth } from '../utils/formatters';
import {
  filterExpensesByMonth,
  calculateSummary,
  calculateBudgetStatus,
  sortExpensesByDate,
} from '../utils/expenseHelpers';

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

export function useExpenses(userId: string) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [userCategories, setUserCategories] = useState<string[]>([]);

  // Load data from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      supabase.from('expenses').select('*').eq('user_id', userId),
      supabase.from('budgets').select('*').eq('user_id', userId),
      supabase.from('user_categories').select('name').eq('user_id', userId).order('created_at'),
    ]).then(([expensesRes, budgetsRes, categoriesRes]) => {
      if (cancelled) return;
      dispatch({
        type: 'IMPORT_DATA',
        payload: {
          expenses: (expensesRes.data ?? []).map(toExpense),
          budgets: (budgetsRes.data ?? []).map(toBudget),
        },
      });
      setUserCategories((categoriesRes.data ?? []).map((r: { name: string }) => r.name));
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId]);

  // --- Actions ---
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

  const updateExpense = useCallback(
    async (id: string, data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
      const existing = state.expenses.find((e) => e.id === id);
      if (!existing) return;
      const updated: Expense = {
        ...existing,
        ...data,
        id,
        updatedAt: new Date().toISOString(),
      };
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
        supabase.from('budgets').upsert(budgets.map((b) => toDbBudget(b, userId)), { onConflict: 'user_id,category_id' }),
      ]);
    },
    [userId]
  );

  // --- Derived data ---
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
    userCategories,
    // Actions
    addUserCategory,
    addExpense,
    updateExpense,
    deleteExpense,
    setBudget,
    deleteBudget,
    setActiveView,
    setViewPeriod,
    setSelectedMonth,
    importData,
    // Derived
    currentMonthExpenses,
    sortedCurrentMonthExpenses,
    allExpensesSorted,
    currentMonthSummary,
    budgetStatuses,
    totalBudget,
  };
}
