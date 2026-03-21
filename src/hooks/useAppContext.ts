import { createContext, useContext } from 'react';
import type { useExpenses } from './useExpenses';

type ExpenseContextType = ReturnType<typeof useExpenses>;

export const ExpenseContext = createContext<ExpenseContextType | null>(null);

export function useAppContext(): ExpenseContextType {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error('useAppContext must be used within ExpenseProvider');
  return ctx;
}
