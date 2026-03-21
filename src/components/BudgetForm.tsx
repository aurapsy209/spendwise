import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { Input, Select } from './ui/Input';
import { Button } from './ui/Button';
import type { Budget, CategoryId } from '../types';
import { CATEGORIES } from '../utils/categories';

interface BudgetFormProps {
  initialData?: Budget;
  existingBudgetIds?: CategoryId[];
  onSubmit: (budget: Budget) => void;
  onCancel: () => void;
}

export function BudgetForm({
  initialData,
  existingBudgetIds = [],
  onSubmit,
  onCancel,
}: BudgetFormProps) {
  const [categoryId, setCategoryId] = useState<CategoryId>(
    initialData?.categoryId || 'food'
  );
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');
  const [errors, setErrors] = useState<{ categoryId?: string; amount?: string }>({});

  const isEditing = !!initialData;

  const availableCategories = CATEGORIES.filter(
    (c) =>
      c.id === initialData?.categoryId ||
      !existingBudgetIds.includes(c.id)
  );

  const categoryOptions = availableCategories.map((c) => ({
    value: c.id,
    label: `${c.icon} ${c.name}`,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Please enter a valid budget amount';
    } else if (parsedAmount > 1_000_000) {
      newErrors.amount = 'Budget cannot exceed $1,000,000';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      categoryId,
      amount: parsedAmount,
      period: 'monthly',
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {availableCategories.length === 0 ? (
        <div className="py-4 text-center text-gray-500 text-sm">
          All categories already have budgets set. Edit existing ones instead.
        </div>
      ) : (
        <>
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value as CategoryId);
              setErrors((prev) => ({ ...prev, categoryId: undefined }));
            }}
            options={categoryOptions}
            error={errors.categoryId}
            disabled={isEditing}
            required
          />

          <Input
            label="Monthly Budget"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="1"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setErrors((prev) => ({ ...prev, amount: undefined }));
            }}
            error={errors.amount}
            leftAddon={<DollarSign size={16} />}
            hint="Set how much you want to spend per month in this category"
            required
            autoFocus
          />

          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onCancel} fullWidth>
              Cancel
            </Button>
            <Button variant="primary" type="submit" fullWidth>
              {isEditing ? 'Update Budget' : 'Set Budget'}
            </Button>
          </div>
        </>
      )}

      {availableCategories.length === 0 && (
        <Button variant="outline" type="button" onClick={onCancel} fullWidth>
          Close
        </Button>
      )}
    </form>
  );
}
