import { useState } from 'react';
import { Plus, Target, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';
import { EmptyState } from './ui/EmptyState';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { BudgetForm } from './BudgetForm';
import { useAppContext } from '../hooks/useAppContext';
import { useToast } from './ui/Toast';
import type { Budget, CategoryId } from '../types';
import { getCategoryById } from '../utils/categories';
import { formatCurrency, formatMonthYear } from '../utils/formatters';
import { clsx } from 'clsx';

export function BudgetView() {
  const { state, setBudget, deleteBudget, budgetStatuses, totalBudget, currentMonthSummary } =
    useAppContext();
  const { showToast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryId | null>(null);

  const existingBudgetIds = state.budgets.map((b) => b.categoryId);

  const handleSetBudget = (budget: Budget) => {
    setBudget(budget);
    setShowAddModal(false);
    setEditingBudget(null);
    showToast('Budget saved successfully', 'success');
  };

  const handleDeleteBudget = () => {
    if (!deletingCategory) return;
    deleteBudget(deletingCategory);
    setDeletingCategory(null);
    showToast('Budget removed', 'info');
  };

  const totalSpent = currentMonthSummary.total;
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const overBudgetCount = budgetStatuses.filter((b) => b.isOverBudget).length;
  const nearBudgetCount = budgetStatuses.filter(
    (b) => !b.isOverBudget && b.percentage >= 80
  ).length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatMonthYear(state.selectedMonth)} — {state.budgets.length} budget
            {state.budgets.length !== 1 ? 's' : ''} set
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={18} />}
          onClick={() => setShowAddModal(true)}
          disabled={existingBudgetIds.length >= 10}
        >
          Set Budget
        </Button>
      </div>

      {/* Overview Card */}
      {state.budgets.length > 0 && (
        <Card className="bg-gradient-to-br from-primary-600 to-primary-700 border-primary-600 text-white">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-primary-200 text-sm font-medium">Overall Budget</p>
                <p className="text-3xl font-bold mt-1">
                  {formatCurrency(totalSpent)}
                  <span className="text-primary-300 text-lg font-normal">
                    {' '}
                    / {formatCurrency(totalBudget)}
                  </span>
                </p>
                <p className="text-primary-200 text-sm mt-1">
                  {formatCurrency(Math.max(totalBudget - totalSpent, 0))} remaining
                </p>
              </div>
              <div className="text-right">
                {overBudgetCount > 0 && (
                  <div className="bg-red-500/20 border border-red-400/30 text-red-100 text-xs px-3 py-1.5 rounded-full font-medium">
                    {overBudgetCount} over budget
                  </div>
                )}
                {nearBudgetCount > 0 && overBudgetCount === 0 && (
                  <div className="bg-yellow-400/20 border border-yellow-400/30 text-yellow-100 text-xs px-3 py-1.5 rounded-full font-medium">
                    {nearBudgetCount} near limit
                  </div>
                )}
              </div>
            </div>
            <ProgressBar
              value={overallPercentage}
              variant={overallPercentage >= 100 ? 'danger' : overallPercentage >= 80 ? 'warning' : 'success'}
              size="lg"
              animated
            />
            <p className="text-primary-200 text-xs">
              {Math.round(overallPercentage)}% of total budget used
            </p>
          </div>
        </Card>
      )}

      {/* Budget List */}
      {state.budgets.length === 0 ? (
        <EmptyState
          icon={<Target size={32} />}
          title="No budgets set"
          description="Set monthly spending limits for your categories to track how well you're staying on budget."
          action={{
            label: 'Set First Budget',
            onClick: () => setShowAddModal(true),
            icon: <Plus size={16} />,
          }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {budgetStatuses.map((status) => {
            const category = getCategoryById(status.categoryId);
            const budget = state.budgets.find((b) => b.categoryId === status.categoryId)!;

            return (
              <Card
                key={status.categoryId}
                className={clsx(
                  'group',
                  status.isOverBudget && 'border-red-200 bg-red-50/30'
                )}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="text-2xl flex-shrink-0"
                        aria-hidden="true"
                        title={category.name}
                      >
                        {category.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {category.name}
                        </p>
                        <p className="text-xs text-gray-500">Monthly limit</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingBudget(budget)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        aria-label={`Edit ${category.name} budget`}
                      >
                        <Pencil size={13} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setDeletingCategory(status.categoryId)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label={`Delete ${category.name} budget`}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-gray-900">
                      {formatCurrency(status.spentAmount)}
                    </span>
                    <span className="text-gray-400">
                      of {formatCurrency(status.budgetAmount)}
                    </span>
                  </div>

                  {/* Progress */}
                  <ProgressBar value={status.percentage} size="md" />

                  {/* Status */}
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={clsx(
                        'font-medium',
                        status.isOverBudget
                          ? 'text-red-600'
                          : status.percentage >= 80
                            ? 'text-yellow-600'
                            : 'text-green-600'
                      )}
                    >
                      {status.isOverBudget
                        ? `${formatCurrency(Math.abs(status.remaining))} over budget`
                        : status.percentage >= 80
                          ? `${formatCurrency(status.remaining)} left — almost there`
                          : `${formatCurrency(status.remaining)} remaining`}
                    </span>
                    <span
                      className={clsx(
                        'font-semibold px-2 py-0.5 rounded-full text-xs',
                        status.isOverBudget
                          ? 'bg-red-100 text-red-700'
                          : status.percentage >= 80
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                      )}
                    >
                      {Math.round(status.percentage)}%
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tip */}
      {state.budgets.length > 0 && (
        <Card className="bg-primary-50 border-primary-100">
          <div className="flex items-start gap-3">
            <TrendingUp size={18} className="text-primary-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-primary-900">Budget Tips</p>
              <p className="text-xs text-primary-700 mt-0.5">
                Budgets reset at the start of each month. You can change the month using the month
                selector in the navigation.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Set Budget">
        <BudgetForm
          existingBudgetIds={existingBudgetIds}
          onSubmit={handleSetBudget}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingBudget}
        onClose={() => setEditingBudget(null)}
        title="Edit Budget"
      >
        {editingBudget && (
          <BudgetForm
            initialData={editingBudget}
            existingBudgetIds={existingBudgetIds}
            onSubmit={handleSetBudget}
            onCancel={() => setEditingBudget(null)}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteBudget}
        title="Remove Budget"
        message={`Are you sure you want to remove the budget for ${
          deletingCategory ? getCategoryById(deletingCategory).name : ''
        }?`}
        confirmLabel="Remove"
      />
    </div>
  );
}
