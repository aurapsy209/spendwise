import type { CategoryId } from './index';

export interface ParsedTransaction {
  date: string;          // YYYY-MM-DD
  description: string;
  amount: number;
  currency: string;
  categoryId: CategoryId;
  notes?: string;
}

export interface ImportRow extends ParsedTransaction {
  rowId: string;         // client-only identifier, not the expense id
  selected: boolean;
  isDuplicate?: boolean; // true if matching expense already exists
}
