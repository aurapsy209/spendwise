import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { parseBankStatement, isScannedPDF } from '../utils/bankStatementParser';
import { useAppContext } from '../hooks/useAppContext';
import type { ParsedTransaction } from '../types/import';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onParsed: (rows: ParsedTransaction[]) => void;
}

type Step = 'upload' | 'reading' | 'parsing' | 'done';

export function BankImportUpload({ isOpen, onClose, onParsed }: Props) {
  const { homeCurrency } = useAppContext();
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setError(null);
    setIsDragging(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      // Validate type
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please upload a PDF file.');
        return;
      }

      // Validate size (20 MB)
      if (file.size > 20 * 1024 * 1024) {
        setError('File is too large. Please upload a PDF under 20 MB.');
        return;
      }

      try {
        // Step 1 — read PDF text
        setStep('reading');
        const arrayBuffer = await file.arrayBuffer();

        // Dynamically import pdfjs to keep it out of the main bundle
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.js',
          import.meta.url
        ).toString();

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();

          // Group text items by Y position to reconstruct lines.
          // PDF Y coords are bottom-up, so higher Y = higher on page.
          // We round to nearest 2px to group items on the same visual line.
          const lineMap = new Map<number, string[]>();
          for (const item of content.items) {
            if (!('str' in item) || !item.str.trim()) continue;
            const y = Math.round((item as { transform: number[] }).transform[5] / 2) * 2;
            if (!lineMap.has(y)) lineMap.set(y, []);
            lineMap.get(y)!.push(item.str);
          }

          // Sort lines top-to-bottom (descending Y) and join
          const lines = [...lineMap.entries()]
            .sort(([a], [b]) => b - a)
            .map(([, items]) => items.join(' '));
          fullText += lines.join('\n') + '\n';
        }

        // Check for scanned/image-only PDF
        if (isScannedPDF(fullText)) {
          setError(
            'This appears to be a scanned PDF with no text layer. Please download a text-based statement from your bank\'s online portal.'
          );
          setStep('upload');
          return;
        }

        // Step 2 — parse transactions
        setStep('parsing');
        // Small delay so the UI updates before the synchronous parse
        await new Promise((r) => setTimeout(r, 50));

        const transactions = parseBankStatement(fullText, homeCurrency);

        if (transactions.length === 0) {
          setError(
            'No transactions were found in this PDF. Try a different date range or export format from your bank.'
          );
          setStep('upload');
          return;
        }

        setStep('done');
        onParsed(transactions);
        reset();
      } catch (err) {
        console.error('PDF parse error:', err);
        setError('Failed to read the PDF. Please try again or use a different file.');
        setStep('upload');
      }
    },
    [homeCurrency, onParsed]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const isProcessing = step === 'reading' || step === 'parsing';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Bank Statement"
      description="Upload a PDF bank statement to extract your transactions"
    >
      <div className="space-y-4">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <Loader2 size={36} className="text-primary-600 animate-spin" />
            <p className="text-sm font-medium text-gray-700">
              {step === 'reading' ? 'Reading PDF…' : 'Extracting transactions…'}
            </p>
            <p className="text-xs text-gray-400">This may take a few seconds</p>
          </div>
        ) : (
          <>
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                isDragging
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-400 hover:bg-gray-50'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDragging ? 'bg-primary-100' : 'bg-gray-100'}`}>
                {isDragging ? (
                  <FileText size={24} className="text-primary-600" />
                ) : (
                  <Upload size={24} className="text-gray-400" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {isDragging ? 'Drop your PDF here' : 'Drag & drop your bank statement'}
                </p>
                <p className="text-xs text-gray-400 mt-1">or click to browse — PDF only, max 20 MB</p>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {/* Tips */}
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-600">Tips for best results:</p>
              <p>• Download statements as PDF from your bank's online portal</p>
              <p>• Use 1–3 month statements for most accurate parsing</p>
              <p>• Text-based PDFs work best (not scanned images)</p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button variant="primary" icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>
                Select PDF
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
