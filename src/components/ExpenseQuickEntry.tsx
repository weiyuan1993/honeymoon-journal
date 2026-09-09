import { useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import type { ExpenseFormData } from '@/types';
import { tripConfig } from '@/config/trip.config';
import type { SubmitStatus } from './expenseUi';

interface ExpenseQuickEntryProps {
  isOpen: boolean;
  onClose: () => void;
  canEdit: boolean;
  formData: ExpenseFormData;
  status: SubmitStatus;
  onChange: (patch: Partial<ExpenseFormData>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function ExpenseQuickEntry({
  isOpen,
  onClose,
  canEdit,
  formData,
  status,
  onChange,
  onSubmit,
}: ExpenseQuickEntryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const itemInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;
    dialog.showModal();
    itemInputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <dialog ref={dialogRef} className="expense-entry-dialog" aria-labelledby="expense-entry-title"
      onCancel={(event) => {
        event.preventDefault();
        if (status !== 'submitting') onClose();
      }}>
    <div className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-deep-blue/7 text-deep-blue">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 3.5h10A1.5 1.5 0 0 1 18.5 5v16l-2.25-1.25L14 21l-2-1.25L10 21l-2.25-1.25L5.5 21V5A1.5 1.5 0 0 1 7 3.5Z" />
              <path d="M8.5 8h7" />
              <path d="M8.5 12h7" />
            </svg>
          </span>
          <h2 id="expense-entry-title" className="text-sm font-semibold text-deep-blue">記下一筆花費</h2>
        </div>
        <button type="button" onClick={onClose} disabled={status === 'submitting'}
          aria-label="關閉記帳" className="trip-modal-close">×</button>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        {!canEdit ? (
          <p className="font-serif text-xs text-ink/50">
            目前為瀏覽模式，可查看功能但無法編輯。
          </p>
        ) : null}
        <input
          ref={itemInputRef}
          aria-label="項目名稱"
          type="text"
          value={formData.item}
          onChange={(event) => onChange({ item: event.target.value })}
          disabled={!canEdit}
          className="expense-field w-full"
          placeholder="項目名稱"
          required
        />
        <div className="grid grid-cols-5 gap-2">
          <input
            aria-label="金額"
            inputMode="decimal"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(event) => onChange({ amount: event.target.value })}
            disabled={!canEdit}
            className="expense-field col-span-3"
            placeholder="金額"
            required
          />
          <select
            aria-label="貨幣"
            value={formData.currency}
            onChange={(event) =>
              onChange({
                currency: event.target.value as ExpenseFormData['currency'],
              })
            }
            disabled={!canEdit}
            className="expense-field col-span-2"
          >
            {tripConfig.currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <select
            aria-label="類別"
            value={formData.category}
            onChange={(event) =>
              onChange({
                category: event.target.value as ExpenseFormData['category'],
              })
            }
            disabled={!canEdit}
            className="expense-field flex-1"
          >
            {tripConfig.categories.map((category) => (
              <option key={category.code} value={category.code}>
                {category.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!canEdit || status === 'submitting'}
            className={`rounded-xl px-5 py-2.5 font-display text-sm text-white transition-all ${
              !canEdit || status === 'submitting'
                ? 'cursor-not-allowed bg-gray-400'
                : 'bg-deep-blue shadow-sm hover:bg-deep-blue/90'
            } ${status === 'success' ? '!bg-deep-blue' : ''}`}
            title={!canEdit ? '需編輯權限' : undefined}
          >
            {status === 'submitting'
              ? '儲存中…'
              : status === 'success'
                ? '已記錄'
                : '記錄花費'}
          </button>
        </div>
      </form>
    </div>
    </dialog>
  );
}
