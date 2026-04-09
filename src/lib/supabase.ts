import { createClient } from '@supabase/supabase-js';
import type { Expense, Budget, CategoryId, RecurringExpense } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── DB row types ─────────────────────────────────────────────────────────────

interface DbExpense {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  exchange_rate: number;
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

interface DbRecurringExpense {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  category_id: string;
  custom_category: string | null;
  description: string;
  notes: string | null;
  frequency: string;
  next_due_date: string;
  is_active: boolean;
  created_at: string;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function toExpense(row: DbExpense): Expense {
  return {
    id: row.id,
    amount: row.amount,
    currency: row.currency ?? 'USD',
    exchangeRate: row.exchange_rate ?? 1,
    categoryId: row.category_id as CategoryId,
    customCategory: row.custom_category ?? undefined,
    description: row.description,
    date: row.date,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toDbExpense(expense: Expense, userId: string): DbExpense {
  return {
    id: expense.id,
    user_id: userId,
    amount: expense.amount,
    currency: expense.currency,
    exchange_rate: expense.exchangeRate,
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

export function toRecurringExpense(row: DbRecurringExpense): RecurringExpense {
  return {
    id: row.id,
    amount: row.amount,
    currency: row.currency ?? 'USD',
    exchangeRate: row.exchange_rate ?? 1,
    categoryId: row.category_id as CategoryId,
    customCategory: row.custom_category ?? undefined,
    description: row.description,
    notes: row.notes ?? undefined,
    frequency: row.frequency as RecurringExpense['frequency'],
    nextDueDate: row.next_due_date,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function toDbRecurringExpense(
  r: RecurringExpense,
  userId: string
): DbRecurringExpense {
  return {
    id: r.id,
    user_id: userId,
    amount: r.amount,
    currency: r.currency,
    exchange_rate: r.exchangeRate,
    category_id: r.categoryId,
    custom_category: r.customCategory ?? null,
    description: r.description,
    notes: r.notes ?? null,
    frequency: r.frequency,
    next_due_date: r.nextDueDate,
    is_active: r.isActive,
    created_at: r.createdAt,
  };
}
