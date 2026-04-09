import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Filter, Pencil, Trash2, SlidersHorizontal } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { CategoryBadge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { ExpenseForm } from './ExpenseForm';
import { useAppContext } from '../hooks/useAppContext';
import { useToast } from './ui/Toast';
import type { Expense, CategoryId } from '../types';
import { formatDate } from '../utils/formatters';
import { formatWithCurrency } from '../utils/currencies';
import { CATEGORIES } from '../utils/categories';
import { sortExpensesByDate } from '../utils/expenseHelpers';
import { getMonthStart, getMonthEnd } from '../utils/dateHelpers';
import { clsx } from 'clsx';

const ITEMS_PER_PAGE = 20;

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export function ExpenseList() {
  const { state, addExpense, updateExpense, deleteExpense, allExpensesSorted, listMonthFilter, setListMonthFilter } = useAppContext();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<CategoryId | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // When navigated from Dashboard with a month filter, apply it as a date range
  useEffect(() => {
    if (listMonthFilter) {
      const s = getMonthStart(listMonthFilter);
      const e = getMonthEnd(listMonthFilter);
      const pad = (n: number) => String(n).padStart(2, '0');
      setStartDate(`${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`);
      setEndDate(`${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}`);
      setShowFilters(true);
      setListMonthFilter(null);
    }
  }, [listMonthFilter, setListMonthFilter]);

  const filtered = useMemo(() => {
    let list = allExpensesSorted;

    if (filterCategory !== 'all') {
      list = list.filter((e) => e.categoryId === filterCategory);
    }

    if (startDate) {
      list = list.filter((e) => e.date >= startDate);
    }

    if (endDate) {
      list = list.filter((e) => e.date <= endDate);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.notes?.toLowerCase().includes(q) ||
          e.customCategory?.toLowerCase().includes(q) ||
          CATEGORIES.find((c) => c.id === e.categoryId)
            ?.name.toLowerCase()
            .includes(q)
      );
    }

    switch (sortBy) {
      case 'date-asc':
        list = [...list].sort((a, b) => a.date.localeCompare(b.date));
        break;
      case 'amount-desc':
        list = [...list].sort((a, b) => b.amount - a.amount);
        break;
      case 'amount-asc':
        list = [...list].sort((a, b) => a.amount - b.amount);
        break;
      default:
        list = sortExpensesByDate(list);
    }

    return list;
  }, [allExpensesSorted, filterCategory, searchQuery, sortBy, startDate, endDate]);

  const paginated = filtered.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = paginated.length < filtered.length;

  const handleAddExpense = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    addExpense(data);
    setShowAddModal(false);
    showToast('Expense added successfully', 'success');
  };

  const handleUpdateExpense = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingExpense) return;
    updateExpense(editingExpense.id, data);
    setEditingExpense(null);
    showToast('Expense updated', 'success');
  };

  const handleDeleteExpense = () => {
    if (!deletingExpenseId) return;
    deleteExpense(deletingExpenseId);
    setDeletingExpenseId(null);
    showToast('Expense deleted', 'info');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCategory('all');
    setSortBy('date-desc');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = searchQuery || filterCategory !== 'all' || sortBy !== 'date-desc' || startDate || endDate;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {state.expenses.length} total expense{state.expenses.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={18} />}
          onClick={() => setShowAddModal(true)}
        >
          Add Expense
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <Card padding="sm">
        <div className="flex gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              aria-label="Search expenses"
            />
          </div>

          {/* Filter toggle */}
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            icon={<SlidersHorizontal size={16} />}
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-controls="filter-panel"
          >
            Filters
            {hasActiveFilters && (
              <span className="ml-1 bg-primary-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                !
              </span>
            )}
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Clear
            </Button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div id="filter-panel" className="mt-3 pt-3 border-t border-gray-100 flex gap-3 flex-wrap">
            {/* Category Filter */}
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value as CategoryId | 'all');
                  setPage(1);
                }}
                className="w-full text-sm border border-gray-300 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Filter by category"
              >
                <option value="all">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full text-sm border border-gray-300 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Sort expenses"
              >
                <option value="date-desc">Date (newest first)</option>
                <option value="date-asc">Date (oldest first)</option>
                <option value="amount-desc">Amount (highest first)</option>
                <option value="amount-asc">Amount (lowest first)</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex-1 min-w-[200px] flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="w-full text-sm border border-gray-300 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  min={startDate || undefined}
                  className="w-full text-sm border border-gray-300 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Results count */}
      {(searchQuery || filterCategory !== 'all') && (
        <p className="text-sm text-gray-500">
          Showing {filtered.length} expense{filtered.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      )}

      {/* Expense List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Filter size={32} />}
          title={hasActiveFilters ? 'No matching expenses' : 'No expenses yet'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'Start tracking your spending by adding your first expense.'
          }
          action={
            !hasActiveFilters
              ? {
                  label: 'Add Expense',
                  onClick: () => setShowAddModal(true),
                  icon: <Plus size={16} />,
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {paginated.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              onEdit={() => setEditingExpense(expense)}
              onDelete={() => setDeletingExpenseId(expense.id)}
            />
          ))}

          {hasMore && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
              >
                Load more ({filtered.length - paginated.length} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Expense"
        description="Track a new expense"
      >
        <ExpenseForm
          onSubmit={handleAddExpense}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="Edit Expense"
      >
        {editingExpense && (
          <ExpenseForm
            initialData={editingExpense}
            onSubmit={handleUpdateExpense}
            onCancel={() => setEditingExpense(null)}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deletingExpenseId}
        onClose={() => setDeletingExpenseId(null)}
        onConfirm={handleDeleteExpense}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}

interface ExpenseRowProps {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
}

function ExpenseRow({ expense, onEdit, onDelete }: ExpenseRowProps) {
  return (
    <Card
      padding="sm"
      className="group hover:shadow-md transition-all duration-150 hover:border-gray-200"
    >
      <div className="flex items-center gap-3">
        {/* Date */}
        <div className="hidden sm:block text-center flex-shrink-0 w-12">
          <div className="text-xs text-gray-400 font-medium">
            {new Date(expense.date + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short',
            })}
          </div>
          <div className="text-lg font-bold text-gray-700 leading-tight">
            {new Date(expense.date + 'T00:00:00').getDate()}
          </div>
        </div>

        {/* Category Icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-gray-50"
          aria-hidden="true"
        >
          {CATEGORIES.find((c) => c.id === expense.categoryId)?.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="font-medium text-gray-900 text-sm truncate">
              {expense.description}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <CategoryBadge categoryId={expense.categoryId} customCategory={expense.customCategory} size="sm" showIcon={false} />
            <span className="text-xs text-gray-400 sm:hidden">{formatDate(expense.date)}</span>
            {expense.notes && (
              <span className="text-xs text-gray-400 truncate max-w-[200px]" title={expense.notes}>
                {expense.notes}
              </span>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-gray-900 text-sm">
            {formatWithCurrency(expense.amount, expense.currency ?? 'USD')}
          </div>
          <div className="text-xs text-gray-400 hidden sm:block">{formatDate(expense.date)}</div>
        </div>

        {/* Actions */}
        <div
          className={clsx(
            'flex items-center gap-1 ml-1 transition-opacity duration-150',
            'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          )}
        >
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            aria-label={`Edit expense: ${expense.description}`}
          >
            <Pencil size={14} aria-hidden="true" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            aria-label={`Delete expense: ${expense.description}`}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </Card>
  );
}
