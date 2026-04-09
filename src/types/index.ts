export type CategoryId =
  | 'food'
  | 'transport'
  | 'entertainment'
  | 'bills'
  | 'healthcare'
  | 'shopping'
  | 'education'
  | 'travel'
  | 'fitness'
  | 'other';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export interface Expense {
  id: string;
  amount: number;
  currency: string;       // e.g. 'USD', 'EUR'
  exchangeRate: number;   // units of home currency per 1 unit of expense currency
  categoryId: CategoryId;
  customCategory?: string;
  description: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  categoryId: CategoryId;
  amount: number;
  period: 'monthly';
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringExpense {
  id: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  categoryId: CategoryId;
  customCategory?: string;
  description: string;
  notes?: string;
  frequency: RecurringFrequency;
  nextDueDate: string; // YYYY-MM-DD
  isActive: boolean;
  createdAt: string;
}

export type ViewPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';

export type ActiveView = 'dashboard' | 'expenses' | 'budgets' | 'reports' | 'recurring';

export interface ExpenseFormData {
  amount: string;
  currency: string;
  exchangeRate: string;
  categoryId: CategoryId;
  customCategory: string;
  description: string;
  date: string;
  notes: string;
}

export interface RecurringFormData {
  amount: string;
  currency: string;
  exchangeRate: string;
  categoryId: CategoryId;
  customCategory: string;
  description: string;
  notes: string;
  frequency: RecurringFrequency;
  startDate: string;
}

export interface BudgetFormData {
  categoryId: CategoryId;
  amount: string;
}

export interface AppState {
  expenses: Expense[];
  budgets: Budget[];
  activeView: ActiveView;
  viewPeriod: ViewPeriod;
  selectedMonth: string; // YYYY-MM
}

export type AppAction =
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'SET_BUDGET'; payload: Budget }
  | { type: 'DELETE_BUDGET'; payload: CategoryId }
  | { type: 'SET_ACTIVE_VIEW'; payload: ActiveView }
  | { type: 'SET_VIEW_PERIOD'; payload: ViewPeriod }
  | { type: 'SET_SELECTED_MONTH'; payload: string }
  | { type: 'IMPORT_DATA'; payload: { expenses: Expense[]; budgets: Budget[] } };

export interface ExpenseSummary {
  total: number;       // in home currency
  count: number;
  byCategory: Record<CategoryId, number>; // in home currency
  byDate: Record<string, number>;
}

export interface BudgetStatus {
  categoryId: CategoryId;
  budgetAmount: number;
  spentAmount: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface LineChartDataPoint {
  date: string;
  amount: number;
}
