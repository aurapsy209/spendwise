import { useState, useCallback } from 'react';
import type { ParsedTransaction, ImportRow } from '../types/import';
import type { CategoryId } from '../types';

export function useBankImport() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);

  const openUpload = useCallback(() => setUploadOpen(true), []);
  const closeUpload = useCallback(() => setUploadOpen(false), []);

  const onParsed = useCallback((transactions: ParsedTransaction[]) => {
    const importRows: ImportRow[] = transactions.map((t) => ({
      ...t,
      rowId: crypto.randomUUID(),
      selected: true,
    }));
    setRows(importRows);
    setUploadOpen(false);
  }, []);

  const clearRows = useCallback(() => setRows([]), []);

  const toggleRow = useCallback((rowId: string) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, selected: !r.selected } : r))
    );
  }, []);

  const updateRow = useCallback(
    (rowId: string, field: keyof Omit<ImportRow, 'rowId' | 'selected' | 'isDuplicate'>, value: string | number) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.rowId !== rowId) return r;
          if (field === 'amount') return { ...r, amount: typeof value === 'number' ? value : parseFloat(value as string) || 0 };
          if (field === 'categoryId') return { ...r, categoryId: value as CategoryId };
          return { ...r, [field]: value };
        })
      );
    },
    []
  );

  const deleteRow = useCallback((rowId: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }, []);

  const selectAll = useCallback(() => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: true })));
  }, []);

  const deselectAll = useCallback(() => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: false })));
  }, []);

  const markDuplicates = useCallback((existingSignatures: Set<string>) => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        isDuplicate: existingSignatures.has(`${r.date}|${r.description}|${r.amount}`),
      }))
    );
  }, []);

  const selectedRows = rows.filter((r) => r.selected);

  return {
    uploadOpen,
    rows,
    selectedRows,
    openUpload,
    closeUpload,
    onParsed,
    clearRows,
    toggleRow,
    updateRow,
    deleteRow,
    selectAll,
    deselectAll,
    markDuplicates,
  };
}
