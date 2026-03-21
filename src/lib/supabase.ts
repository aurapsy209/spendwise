import { createClient } from '@supabase/supabase-js';
import type { Expense, Budget, CategoryId } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── DB row types ────────────────────────────────────────────────────────────

interface DbExpense {
  id: string;
  user_id: string;
  amount: number;
  category_id: string;
  custom_category: string | null;
  description: string;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface DbBudget {
  user_id: string;
  category_id: string;
  amount: number;
  period: string;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

export function toExpense(row: DbExpense): Expense {
  return {
    id: row.id,
    amount: row.amount,
    categoryId: row.category_id as CategoryId,
    customCategory: row.custom_category ?? undefined,
    description: row.description,
    date: row.date,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toDbExpense(expense: Expense, userId: string): Omit<DbExpense, 'user_id'> & { user_id: string } {
  return {
    id: expense.id,
    user_id: userId,
    amount: expense.amount,
    category_id: expense.categoryId,
    custom_category: expense.customCategory ?? null,
    description: expense.description,
    date: expense.date,
    notes: expense.notes ?? null,
    created_at: expense.createdAt,
    updated_at: expense.updatedAt,
  };
}

export function toBudget(row: DbBudget): Budget {
  return {
    categoryId: row.category_id as CategoryId,
    amount: row.amount,
    period: 'monthly',
  };
}

export function toDbBudget(budget: Budget, userId: string): DbBudget {
  return {
    user_id: userId,
    category_id: budget.categoryId,
    amount: budget.amount,
    period: budget.period,
  };
}
