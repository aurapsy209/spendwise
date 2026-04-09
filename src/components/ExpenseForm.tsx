import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Calendar, Tag, FileText, Check, X } from 'lucide-react';
import { Input, Textarea } from './ui/Input';
import { Button } from './ui/Button';
import { useAppContext } from '../hooks/useAppContext';
import type { Expense, CategoryId, ExpenseFormData } from '../types';
import { CATEGORIES } from '../utils/categories';
import { today } from '../utils/formatters';
import { CURRENCIES, getDefaultRate, formatWithCurrency } from '../utils/currencies';
import { clsx } from 'clsx';

interface ExpenseFormProps {
  initialData?: Expense;
  onSubmit: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

function validate(
  data: ExpenseFormData
): Partial<Record<keyof ExpenseFormData, string>> {
  const errors: Partial<Record<keyof ExpenseFormData, string>> = {};

  const amount = parseFloat(data.amount);
  if (!data.amount || isNaN(amount) || amount <= 0) {
    errors.amount = 'Please enter a valid amount greater than 0';
  } else if (amount > 1_000_000) {
    errors.amount = 'Amount cannot exceed 1,000,000';
  }

  if (!data.description.trim()) {
    errors.description = 'Description is required';
  } else if (data.description.trim().length < 2) {
    errors.description = 'Description must be at least 2 characters';
  } else if (data.description.length > 100) {
    errors.description = 'Description cannot exceed 100 characters';
  }

  if (!data.date) {
    errors.date = 'Date is required';
  }

  const rate = parseFloat(data.exchangeRate);
  if (isNaN(rate) || rate <= 0) {
    errors.exchangeRate = 'Exchange rate must be greater than 0';
  }

  return errors;
}

export function ExpenseForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}: ExpenseFormProps) {
  const { userCategories, addUserCategory, homeCurrency } = useAppContext();

  const defaultCurrency = homeCurrency || 'USD';

  const [formData, setFormData] = useState<ExpenseFormData>(() => {
    if (initialData) {
      return {
        amount: String(initialData.amount),
        currency: initialData.currency ?? defaultCurrency,
        exchangeRate: String(initialData.exchangeRate ?? 1),
        categoryId: initialData.categoryId,
        customCategory: initialData.customCategory || '',
        description: initialData.description,
        date: initialData.date,
        notes: initialData.notes || '',
      };
    }
    return {
      amount: '',
      currency: defaultCurrency,
      exchangeRate: '1',
      categoryId: 'food',
      customCategory: '',
      description: '',
      date: today(),
      notes: '',
    };
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ExpenseFormData, boolean>>>({});
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [createError, setCreateError] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!initialData;
  const showExchangeRate = formData.currency !== homeCurrency;

  useEffect(() => {
    if (Object.keys(touched).length > 0) setErrors(validate(formData));
  }, [formData, touched]);

  useEffect(() => {
    if (showCreateInput) createInputRef.current?.focus();
  }, [showCreateInput]);

  // Auto-update exchange rate when currency changes
  useEffect(() => {
    if (!isEditing) {
      const rate = getDefaultRate(formData.currency, homeCurrency);
      setFormData((prev) => ({ ...prev, exchangeRate: rate.toFixed(4) }));
    }
  }, [formData.currency, homeCurrency, isEditing]);

  const handleChange = <K extends keyof ExpenseFormData>(key: K, value: ExpenseFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const handleBlur = (key: keyof ExpenseFormData) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const selectValue =
    formData.categoryId === 'other' &&
    formData.customCategory &&
    userCategories.includes(formData.customCategory)
      ? `custom:${formData.customCategory}`
      : formData.categoryId;

  const handleCategoryChange = (val: string) => {
    if (val === '__create__') {
      setShowCreateInput(true);
      setNewCategoryName('');
      setCreateError('');
    } else if (val.startsWith('custom:')) {
      const name = val.slice(7);
      setFormData((prev) => ({ ...prev, categoryId: 'other', customCategory: name }));
      setTouched((prev) => ({ ...prev, categoryId: true }));
      setShowCreateInput(false);
    } else {
      setFormData((prev) => ({ ...prev, categoryId: val as CategoryId, customCategory: '' }));
      setTouched((prev) => ({ ...prev, categoryId: true }));
      setShowCreateInput(false);
    }
  };

  const handleSaveCustomCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) { setCreateError('Please enter a category name'); return; }
    if (name.length > 40) { setCreateError('Category name cannot exceed 40 characters'); return; }
    if (userCategories.map((c) => c.toLowerCase()).includes(name.toLowerCase())) {
      setCreateError('Category already exists'); return;
    }
    await addUserCategory(name);
    setFormData((prev) => ({ ...prev, categoryId: 'other', customCategory: name }));
    setTouched((prev) => ({ ...prev, categoryId: true }));
    setNewCategoryName('');
    setShowCreateInput(false);
    setCreateError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = Object.fromEntries(
      Object.keys(formData).map((k) => [k, true])
    ) as Record<keyof ExpenseFormData, boolean>;
    setTouched(allTouched);

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    onSubmit({
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      exchangeRate: parseFloat(formData.exchangeRate),
      categoryId: formData.categoryId as CategoryId,
      customCategory:
        formData.categoryId === 'other' && formData.customCategory
          ? formData.customCategory
          : undefined,
      description: formData.description.trim(),
      date: formData.date,
      notes: formData.notes.trim() || undefined,
    });
  };

  const currentCat = CATEGORIES.find((c) => c.id === formData.categoryId);
  const displayName =
    formData.categoryId === 'other' && formData.customCategory
      ? formData.customCategory
      : currentCat?.name ?? '';

  const homeAmount =
    parseFloat(formData.amount) > 0
      ? parseFloat(formData.amount) * parseFloat(formData.exchangeRate || '1')
      : null;

  const selectClass = clsx(
    'block w-full rounded-lg border bg-white text-gray-900 text-sm py-2.5 pl-3 pr-8',
    'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
    'appearance-none cursor-pointer border-gray-300 hover:border-gray-400'
  );
  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 0.5rem center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '1.5em 1.5em',
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Amount + Currency */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            label="Amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            max="1000000"
            placeholder="0.00"
            value={formData.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            onBlur={() => handleBlur('amount')}
            error={touched.amount ? errors.amount : undefined}
            leftAddon={<DollarSign size={16} aria-hidden="true" />}
            required
            autoFocus={!isEditing}
          />
        </div>
        <div className="w-28">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
          <select
            value={formData.currency}
            onChange={(e) => handleChange('currency', e.target.value)}
            className={selectClass}
            style={selectStyle}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Exchange Rate (shown when currency differs from home) */}
      {showExchangeRate && (
        <div>
          <Input
            label={`Exchange rate (1 ${formData.currency} = ? ${homeCurrency})`}
            type="number"
            inputMode="decimal"
            step="0.0001"
            min="0.0001"
            placeholder="1.0000"
            value={formData.exchangeRate}
            onChange={(e) => handleChange('exchangeRate', e.target.value)}
            onBlur={() => handleBlur('exchangeRate')}
            error={touched.exchangeRate ? errors.exchangeRate : undefined}
          />
          {homeAmount !== null && !isNaN(homeAmount) && (
            <p className="mt-1 text-xs text-gray-500">
              ≈ {formatWithCurrency(homeAmount, homeCurrency)} in {homeCurrency}
            </p>
          )}
        </div>
      )}

      {/* Description */}
      <Input
        label="Description"
        type="text"
        placeholder="What did you spend on?"
        value={formData.description}
        onChange={(e) => handleChange('description', e.target.value)}
        onBlur={() => handleBlur('description')}
        error={touched.description ? errors.description : undefined}
        leftAddon={<FileText size={16} aria-hidden="true" />}
        required
        maxLength={100}
      />

      {/* Category */}
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Category <span className="text-red-500 ml-1" aria-hidden="true">*</span>
        </label>
        <select
          value={selectValue}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className={selectClass}
          style={selectStyle}
          required
        >
          <optgroup label="Standard Categories">
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </optgroup>
          {userCategories.length > 0 && (
            <optgroup label="My Categories">
              {userCategories.map((name) => (
                <option key={name} value={`custom:${name}`}>🏷️ {name}</option>
              ))}
            </optgroup>
          )}
          <option value="__create__">➕ Create new category...</option>
        </select>

        {showCreateInput && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-2">New category name</p>
            <div className="flex gap-2">
              <input
                ref={createInputRef}
                type="text"
                value={newCategoryName}
                onChange={(e) => { setNewCategoryName(e.target.value); setCreateError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleSaveCustomCategory(); }
                  if (e.key === 'Escape') setShowCreateInput(false);
                }}
                placeholder="e.g. Pets, Gifts, Hobbies..."
                maxLength={40}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={handleSaveCustomCategory}
                className="p-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                aria-label="Save category"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={() => setShowCreateInput(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Cancel"
              >
                <X size={16} />
              </button>
            </div>
            {createError && <p className="mt-1.5 text-xs text-red-600">{createError}</p>}
          </div>
        )}
      </div>

      {/* Date */}
      <Input
        label="Date"
        type="date"
        value={formData.date}
        onChange={(e) => handleChange('date', e.target.value)}
        onBlur={() => handleBlur('date')}
        error={touched.date ? errors.date : undefined}
        leftAddon={<Calendar size={16} aria-hidden="true" />}
        max={today()}
        required
      />

      {/* Notes */}
      <Textarea
        label="Notes (optional)"
        placeholder="Add any extra details..."
        value={formData.notes}
        onChange={(e) => handleChange('notes', e.target.value)}
        rows={2}
        maxLength={250}
        hint={`${formData.notes.length}/250 characters`}
      />

      {/* Category preview */}
      <div className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg">
        <span aria-hidden="true" className="text-xl">{currentCat?.icon}</span>
        <span className="text-sm text-gray-600">{displayName}</span>
        <Tag size={14} className="text-gray-400 ml-auto" aria-hidden="true" />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" type="button" onClick={onCancel} fullWidth>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={loading} fullWidth>
          {isEditing ? 'Update Expense' : 'Add Expense'}
        </Button>
      </div>
    </form>
  );
}
