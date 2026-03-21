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
  categoryId: CategoryId;
  customCategory?: string; // used when categoryId === 'other'
  description: string;
  date: string; // ISO date string YYYY-MM-DD
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  categoryId: CategoryId;
  amount: number;
  period: 'monthly';
}

export type ViewPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';

export type ActiveView = 'dashboard' | 'expenses' | 'budgets' | 'reports';

export interface ExpenseFormData {
  amount: string;
  categoryId: CategoryId;
  customCategory: string;
  description: string;
  date: string;
  notes: string;
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
  total: number;
  count: number;
  byCategory: Record<CategoryId, number>;
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
