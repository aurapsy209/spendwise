import { useEffect, useRef } from 'react';
import { Trash2, AlertTriangle, ArrowLeft, CheckSquare, Square, Upload } from 'lucide-react';
import { Button } from './ui/Button';
import { useAppContext } from '../hooks/useAppContext';
import { CATEGORIES } from '../utils/categories';
import { useToast } from './ui/Toast';
import type { useBankImport } from '../hooks/useBankImport';

type ImportHook = ReturnType<typeof useBankImport>;

interface Props {
  hook: ImportHook;
}

export function BankImportReview({ hook }: Props) {
  const { state, addExpensesBulk, setActiveView, homeCurrency } = useAppContext();
  const { showToast } = useToast();
  const {
    rows,
    selectedRows,
    toggleRow,
    updateRow,
    deleteRow,
    selectAll,
    deselectAll,
    clearRows,
    markDuplicates,
  } = hook;

  // Mark duplicates once on mount / whenever expenses change
  const signaturesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const sigs = new Set(
      state.expenses.map((e) => `${e.date}|${e.description}|${e.amount}`)
    );
    signaturesRef.current = sigs;
    markDuplicates(sigs);
  }, [state.expenses, markDuplicates]);

  const handleCancel = () => {
    clearRows();
    setActiveView('expenses');
  };

  const handleImport = async () => {
    if (selectedRows.length === 0) return;
    try {
      await addExpensesBulk(
        selectedRows.map((r) => ({
          amount: r.amount,
          currency: r.currency,
          exchangeRate: 1,
          categoryId: r.categoryId,
          description: r.description,
          date: r.date,
          notes: r.notes ?? '',
        }))
      );
      showToast(`Imported ${selectedRows.length} expense${selectedRows.length !== 1 ? 's' : ''}`, 'success');
      clearRows();
      setActiveView('expenses');
    } catch {
      showToast('Import failed — please try again', 'error');
    }
  };

  const allSelected = rows.length > 0 && rows.every((r) => r.selected);
  const noneSelected = rows.every((r) => !r.selected);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {rows.length} transaction{rows.length !== 1 ? 's' : ''} found — edit categories and details before importing
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Upload size={16} />}
            onClick={handleImport}
            disabled={noneSelected}
          >
            Import {selectedRows.length > 0 ? selectedRows.length : ''} Expense{selectedRows.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>

      {/* Select controls */}
      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={allSelected ? deselectAll : selectAll}
          className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700 font-medium"
        >
          {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">{selectedRows.length} of {rows.length} selected</span>
        {rows.some((r) => r.isDuplicate) && (
          <>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1 text-amber-600 text-xs">
              <AlertTriangle size={13} />
              Yellow rows may already exist
            </span>
          </>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-10 px-3 py-3 text-left"></th>
              <th className="px-3 py-3 text-left font-semibold text-gray-600">Date</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-600">Description</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-600">Category</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-600">Amount ({homeCurrency})</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-600">Notes</th>
              <th className="w-10 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr
                key={row.rowId}
                className={`transition-colors ${
                  row.isDuplicate ? 'bg-amber-50' : row.selected ? 'bg-white' : 'bg-gray-50 opacity-60'
                }`}
              >
                {/* Checkbox */}
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={() => toggleRow(row.rowId)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>

                {/* Date */}
                <td className="px-3 py-2">
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) => updateRow(row.rowId, 'date', e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-32 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </td>

                {/* Description */}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => updateRow(row.rowId, 'description', e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {row.isDuplicate && (
                    <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                      <AlertTriangle size={11} /> Possible duplicate
                    </p>
                  )}
                </td>

                {/* Category */}
                <td className="px-3 py-2">
                  <select
                    value={row.categoryId}
                    onChange={(e) => updateRow(row.rowId, 'categoryId', e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Amount */}
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.amount}
                    onChange={(e) => updateRow(row.rowId, 'amount', e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-24 text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </td>

                {/* Notes */}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.notes ?? ''}
                    placeholder="Optional"
                    onChange={(e) => updateRow(row.rowId, 'notes', e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </td>

                {/* Delete */}
                <td className="px-3 py-2">
                  <button
                    onClick={() => deleteRow(row.rowId)}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                    title="Remove row"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {rows.map((row) => (
          <div
            key={row.rowId}
            className={`rounded-xl border p-4 space-y-3 ${
              row.isDuplicate
                ? 'border-amber-200 bg-amber-50'
                : row.selected
                ? 'border-gray-200 bg-white'
                : 'border-gray-100 bg-gray-50 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <input
                type="checkbox"
                checked={row.selected}
                onChange={() => toggleRow(row.rowId)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              {row.isDuplicate && (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle size={12} /> Possible duplicate
                </span>
              )}
              <button
                onClick={() => deleteRow(row.rowId)}
                className="p-1 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <label className="text-xs text-gray-500 font-medium">Date</label>
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(row.rowId, 'date', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Amount ({homeCurrency})</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.amount}
                  onChange={(e) => updateRow(row.rowId, 'amount', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium">Description</label>
              <input
                type="text"
                value={row.description}
                onChange={(e) => updateRow(row.rowId, 'description', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium">Category</label>
              <select
                value={row.categoryId}
                onChange={(e) => updateRow(row.rowId, 'categoryId', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium">Notes</label>
              <input
                type="text"
                value={row.notes ?? ''}
                placeholder="Optional"
                onChange={(e) => updateRow(row.rowId, 'notes', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          No transactions to review.
        </div>
      )}

      {/* Sticky bottom bar on mobile */}
      {rows.length > 0 && (
        <div className="md:hidden sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleImport}
            disabled={noneSelected}
          >
            Import {selectedRows.length}
          </Button>
        </div>
      )}
    </div>
  );
}
