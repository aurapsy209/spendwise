import React, { useState } from 'react';
import { Plus, Repeat, Trash2, Power, PowerOff, Calendar, Check, X } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Input, Select, Textarea } from './ui/Input';
import { CategoryBadge } from './ui/Badge';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { EmptyState } from './ui/EmptyState';
import { useAppContext } from '../hooks/useAppContext';
import { useToast } from './ui/Toast';
import type { RecurringExpense, RecurringFormData, CategoryId } from '../types';
import { CATEGORIES } from '../utils/categories';
import { formatWithCurrency, CURRENCIES, getDefaultRate } from '../utils/currencies';
import { today } from '../utils/formatters';
import { clsx } from 'clsx';

const FREQUENCY_LABELS: Record<RecurringExpense['frequency'], string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const FREQUENCY_OPTIONS = [
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
];

function validate(data: RecurringFormData): Partial<Record<keyof RecurringFormData, string>> {
  const errors: Partial<Record<keyof RecurringFormData, string>> = {};
  const amount = parseFloat(data.amount);
  if (!data.amount || isNaN(amount) || amount <= 0) {
    errors.amount = 'Please enter a valid amount';
  }
  if (!data.description.trim()) {
    errors.description = 'Description is required';
  }
  if (!data.startDate) {
    errors.startDate = 'Start date is required';
  }
  const rate = parseFloat(data.exchangeRate);
  if (isNaN(rate) || rate <= 0) {
    errors.exchangeRate = 'Exchange rate must be greater than 0';
  }
  return errors;
}

interface RecurringFormProps {
  onSubmit: (data: Omit<RecurringExpense, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

function RecurringForm({ onSubmit, onCancel }: RecurringFormProps) {
  const { homeCurrency, userCategories, addUserCategory } = useAppContext();
  const defaultCurrency = homeCurrency || 'USD';

  const [formData, setFormData] = useState<RecurringFormData>({
    amount: '',
    currency: defaultCurrency,
    exchangeRate: '1',
    categoryId: 'food',
    customCategory: '',
    description: '',
    notes: '',
    frequency: 'monthly',
    startDate: today(),
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RecurringFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof RecurringFormData, boolean>>>({});
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [createError, setCreateError] = useState('');

  const showExchangeRate = formData.currency !== homeCurrency;

  const handleChange = <K extends keyof RecurringFormData>(key: K, value: RecurringFormData[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'currency') {
        next.exchangeRate = getDefaultRate(value as string, homeCurrency).toFixed(4);
      }
      return next;
    });
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const handleBlur = (key: keyof RecurringFormData) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors(validate(formData));
  };

  const selectValue =
    formData.categoryId === 'other' && formData.customCategory && userCategories.includes(formData.customCategory)
      ? `custom:${formData.customCategory}`
      : formData.categoryId;

  const handleCategoryChange = (val: string) => {
    if (val === '__create__') {
      setShowCreateInput(true);
    } else if (val.startsWith('custom:')) {
      const name = val.slice(7);
      setFormData((prev) => ({ ...prev, categoryId: 'other', customCategory: name }));
      setShowCreateInput(false);
    } else {
      setFormData((prev) => ({ ...prev, categoryId: val as CategoryId, customCategory: '' }));
      setShowCreateInput(false);
    }
  };

  const handleSaveCustomCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) { setCreateError('Please enter a name'); return; }
    await addUserCategory(name);
    setFormData((prev) => ({ ...prev, categoryId: 'other', customCategory: name }));
    setNewCategoryName('');
    setShowCreateInput(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = Object.fromEntries(Object.keys(formData).map((k) => [k, true])) as Record<keyof RecurringFormData, boolean>;
    setTouched(allTouched);
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }

    onSubmit({
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      exchangeRate: parseFloat(formData.exchangeRate),
      categoryId: formData.categoryId as CategoryId,
      customCategory: formData.categoryId === 'other' && formData.customCategory ? formData.customCategory : undefined,
      description: formData.description.trim(),
      notes: formData.notes.trim() || undefined,
      frequency: formData.frequency,
      nextDueDate: formData.startDate,
      isActive: true,
    });
  };

  const selectClass = 'block w-full rounded-lg border bg-white text-gray-900 text-sm py-2.5 pl-3 pr-8 appearance-none cursor-pointer border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
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
            placeholder="0.00"
            value={formData.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            onBlur={() => handleBlur('amount')}
            error={touched.amount ? errors.amount : undefined}
            required
            autoFocus
          />
        </div>
        <div className="w-28">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
          <select value={formData.currency} onChange={(e) => handleChange('currency', e.target.value)} className={selectClass} style={selectStyle}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </div>
      </div>

      {showExchangeRate && (
        <Input
          label={`Exchange rate (1 ${formData.currency} = ? ${homeCurrency})`}
          type="number"
          inputMode="decimal"
          step="0.0001"
          min="0.0001"
          value={formData.exchangeRate}
          onChange={(e) => handleChange('exchangeRate', e.target.value)}
          onBlur={() => handleBlur('exchangeRate')}
          error={touched.exchangeRate ? errors.exchangeRate : undefined}
        />
      )}

      <Input
        label="Description"
        type="text"
        placeholder="e.g. Netflix, Gym membership..."
        value={formData.description}
        onChange={(e) => handleChange('description', e.target.value)}
        onBlur={() => handleBlur('description')}
        error={touched.description ? errors.description : undefined}
        required
        maxLength={100}
      />

      {/* Category */}
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Category <span className="text-red-500">*</span></label>
        <select value={selectValue} onChange={(e) => handleCategoryChange(e.target.value)} className={selectClass} style={selectStyle}>
          <optgroup label="Standard Categories">
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </optgroup>
          {userCategories.length > 0 && (
            <optgroup label="My Categories">
              {userCategories.map((name) => <option key={name} value={`custom:${name}`}>🏷️ {name}</option>)}
            </optgroup>
          )}
          <option value="__create__">➕ Create new category...</option>
        </select>

        {showCreateInput && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex gap-2">
              <input
                type="text" value={newCategoryName}
                onChange={(e) => { setNewCategoryName(e.target.value); setCreateError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveCustomCategory(); } if (e.key === 'Escape') setShowCreateInput(false); }}
                placeholder="Category name..."
                maxLength={40}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button type="button" onClick={handleSaveCustomCategory} className="p-1.5 bg-primary-600 text-white rounded-lg"><Check size={16} /></button>
              <button type="button" onClick={() => setShowCreateInput(false)} className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg"><X size={16} /></button>
            </div>
            {createError && <p className="mt-1 text-xs text-red-600">{createError}</p>}
          </div>
        )}
      </div>

      {/* Frequency */}
      <Select
        label="Repeats"
        value={formData.frequency}
        onChange={(e) => handleChange('frequency', e.target.value as RecurringExpense['frequency'])}
        options={FREQUENCY_OPTIONS}
        required
      />

      {/* Start Date */}
      <Input
        label="First due date"
        type="date"
        value={formData.startDate}
        onChange={(e) => handleChange('startDate', e.target.value)}
        onBlur={() => handleBlur('startDate')}
        error={touched.startDate ? errors.startDate : undefined}
        leftAddon={<Calendar size={16} />}
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
      />

      <div className="flex gap-3 pt-2">
        <Button variant="outline" type="button" onClick={onCancel} fullWidth>Cancel</Button>
        <Button variant="primary" type="submit" fullWidth>Add Recurring</Button>
      </div>
    </form>
  );
}

export function RecurringView() {
  const { recurringExpenses, addRecurringExpense, toggleRecurringExpense, deleteRecurringExpense, homeCurrency } = useAppContext();
  const { showToast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async (data: Omit<RecurringExpense, 'id' | 'createdAt'>) => {
    await addRecurringExpense(data);
    setShowAddModal(false);
    showToast('Recurring expense added', 'success');
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteRecurringExpense(deletingId);
    setDeletingId(null);
    showToast('Recurring expense deleted', 'info');
  };

  const active = recurringExpenses.filter((r) => r.isActive);
  const inactive = recurringExpenses.filter((r) => !r.isActive);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recurring Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Auto-tracked repeating payments</p>
        </div>
        <Button variant="primary" icon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          Add Recurring
        </Button>
      </div>

      {recurringExpenses.length === 0 ? (
        <EmptyState
          icon={<Repeat size={32} />}
          title="No recurring expenses"
          description="Track subscriptions, rent, and other repeating payments automatically."
          action={{ label: 'Add Recurring', onClick: () => setShowAddModal(true), icon: <Plus size={16} /> }}
        />
      ) : (
        <div className="space-y-5">
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Active ({active.length})</h2>
              <div className="space-y-2">
                {active.map((r) => (
                  <RecurringRow
                    key={r.id}
                    recurring={r}
                    homeCurrency={homeCurrency}
                    onToggle={() => toggleRecurringExpense(r.id)}
                    onDelete={() => setDeletingId(r.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Paused ({inactive.length})</h2>
              <div className="space-y-2">
                {inactive.map((r) => (
                  <RecurringRow
                    key={r.id}
                    recurring={r}
                    homeCurrency={homeCurrency}
                    onToggle={() => toggleRecurringExpense(r.id)}
                    onDelete={() => setDeletingId(r.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Recurring Expense" description="Set up an expense that repeats automatically">
        <RecurringForm onSubmit={handleAdd} onCancel={() => setShowAddModal(false)} />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Recurring Expense"
        message="This will stop the recurring expense from generating future transactions. Already generated expenses are not affected."
        confirmLabel="Delete"
      />
    </div>
  );
}

interface RecurringRowProps {
  recurring: RecurringExpense;
  homeCurrency: string;
  onToggle: () => void;
  onDelete: () => void;
}

function RecurringRow({ recurring: r, homeCurrency, onToggle, onDelete }: RecurringRowProps) {
  const homeAmount = r.amount * (r.exchangeRate ?? 1);
  const isForeign = r.currency !== homeCurrency;

  return (
    <Card padding="sm" className={clsx('group transition-all duration-150', !r.isActive && 'opacity-60')}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-gray-50 flex-shrink-0">
          {CATEGORIES.find((c) => c.id === r.categoryId)?.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 text-sm truncate">{r.description}</span>
            <span className="text-xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-full font-medium">
              {FREQUENCY_LABELS[r.frequency]}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <CategoryBadge categoryId={r.categoryId} customCategory={r.customCategory} size="sm" showIcon={false} />
            <span className="text-xs text-gray-400">
              Next: {new Date(r.nextDueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="text-right flex-shrink-0 mr-2">
          <div className="font-bold text-gray-900 text-sm">
            {formatWithCurrency(r.amount, r.currency)}
          </div>
          {isForeign && (
            <div className="text-xs text-gray-400">
              ≈ {formatWithCurrency(homeAmount, homeCurrency)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              r.isActive
                ? 'text-green-500 hover:text-orange-500 hover:bg-orange-50'
                : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
            )}
            aria-label={r.isActive ? 'Pause recurring expense' : 'Resume recurring expense'}
            title={r.isActive ? 'Pause' : 'Resume'}
          >
            {r.isActive ? <Power size={15} /> : <PowerOff size={15} />}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Delete recurring expense"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </Card>
  );
}
