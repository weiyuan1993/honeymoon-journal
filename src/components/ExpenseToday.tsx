import { useMemo } from 'react';
import type { FormEvent } from 'react';
import type {
  ExpenseFormData,
  ExpenseItem as ExpenseItemType,
} from '@/types';
import { getCurrencySymbol, tripConfig } from '@/config/trip.config';
import ExpenseItem from './ExpenseItem';
import { aggregateExpensesByCurrency } from './expenseData';
import {
  expenseAmountFormatter,
  ExpenseLedgerState,
  ExpenseWarning,
  type LoadStatus,
  type SubmitStatus,
} from './expenseUi';

export interface ExpenseTodayModel {
  formData: ExpenseFormData;
  submitStatus: SubmitStatus;
  todayKey: string;
  items: ExpenseItemType[];
  ledgerStatus: LoadStatus;
  ledgerWarning: string | null;
}

interface ExpenseTodayProps {
  canEdit: boolean;
  model: ExpenseTodayModel;
  onFormChange: (patch: Partial<ExpenseFormData>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onItemUpdate: (updatedItem?: ExpenseItemType) => void;
  onItemDelete: (rowNumber: number) => void;
}

interface QuickEntryFormProps {
  canEdit: boolean;
  formData: ExpenseFormData;
  status: SubmitStatus;
  onChange: (patch: Partial<ExpenseFormData>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function QuickEntryForm({
  canEdit,
  formData,
  status,
  onChange,
  onSubmit,
}: QuickEntryFormProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/15 via-white to-gold/5 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold text-white shadow-sm">
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
          <h2 className="font-display text-sm text-ink/80">快速記帳</h2>
        </div>
        {status === 'success' ? (
          <span className="rounded-full bg-deep-blue/10 px-2 py-1 font-serif text-[13px] text-deep-blue">
            已記錄
          </span>
        ) : null}
      </div>
      <form onSubmit={onSubmit} className="space-y-2.5">
        {!canEdit ? (
          <p className="font-serif text-xs text-ink/50">
            目前為瀏覽模式，可查看功能但無法編輯。
          </p>
        ) : null}
        <input
          type="text"
          value={formData.item}
          onChange={(event) => onChange({ item: event.target.value })}
          disabled={!canEdit}
          className="w-full rounded-xl border border-gold/20 bg-white/90 px-3 py-2.5 font-serif text-sm transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
          placeholder="項目名稱"
          required
        />
        <div className="grid grid-cols-5 gap-2">
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(event) => onChange({ amount: event.target.value })}
            disabled={!canEdit}
            className="col-span-3 rounded-xl border border-gold/20 bg-white/90 px-3 py-2.5 font-serif text-sm transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
            placeholder="金額"
            required
          />
          <select
            value={formData.currency}
            onChange={(event) =>
              onChange({
                currency: event.target.value as ExpenseFormData['currency'],
              })
            }
            disabled={!canEdit}
            className="col-span-2 rounded-xl border border-gold/20 bg-white/90 px-2 py-2.5 font-serif text-sm transition-colors focus:border-gold focus:outline-none"
          >
            {tripConfig.currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.symbol} {currency.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <select
            value={formData.category}
            onChange={(event) =>
              onChange({
                category: event.target.value as ExpenseFormData['category'],
              })
            }
            disabled={!canEdit}
            className="flex-1 rounded-xl border border-gold/20 bg-white/90 px-3 py-2.5 font-serif text-sm transition-colors focus:border-gold focus:outline-none"
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
                : 'bg-ink shadow-sm hover:bg-ink/90'
            } ${status === 'success' ? '!bg-deep-blue' : ''}`}
            title={!canEdit ? '需編輯權限' : undefined}
          >
            {status === 'submitting'
              ? '...'
              : status === 'success'
                ? '✔'
                : '記錄'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ExpenseToday({
  canEdit,
  model,
  onFormChange,
  onSubmit,
  onItemUpdate,
  onItemDelete,
}: ExpenseTodayProps) {
  const totals = useMemo(
    () => aggregateExpensesByCurrency(model.items),
    [model.items]
  );

  return (
    <div className="space-y-4">
      <QuickEntryForm
        canEdit={canEdit}
        formData={model.formData}
        status={model.submitStatus}
        onChange={onFormChange}
        onSubmit={onSubmit}
      />

      {model.ledgerWarning ? (
        <ExpenseWarning>{model.ledgerWarning}</ExpenseWarning>
      ) : null}

      <section className="space-y-3">
        <div className="rounded-2xl border border-gold/15 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-sm text-ink/80">今日總覽</h2>
              <p className="mt-0.5 font-serif text-[13px] text-ink/45">
                {model.todayKey.split('-').join('/')} ·{' '}
                {model.ledgerStatus === 'ready'
                  ? `${model.items.length} 筆`
                  : '資料尚未載入'}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {Object.entries(totals).map(([currency, total]) => (
                <div
                  key={currency}
                  className="min-w-20 rounded-xl bg-gold/10 px-3 py-2 text-right"
                >
                  <div className="font-serif text-xs leading-none text-ink/45">
                    {currency}
                  </div>
                  <div className="mt-1 font-display text-base font-bold text-gold">
                    {getCurrencySymbol(currency)}{' '}
                    {expenseAmountFormatter.format(total)}
                  </div>
                </div>
              ))}
              {model.ledgerStatus === 'ready' && model.items.length === 0 ? (
                <span className="font-serif text-sm text-ink/40">
                  今日尚無花費
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <ExpenseLedgerState
          status={model.ledgerStatus}
          isEmpty={model.items.length === 0}
          emptyText="今日尚無花費紀錄"
        >
          <div className="overflow-hidden rounded-lg bg-white shadow-sm">
            <div className="border-b border-gold/10 bg-gradient-to-r from-gold/5 to-transparent px-3 py-1.5">
              <h3 className="font-display text-xs text-ink/60">今日明細</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {model.items.map((item) => (
                <ExpenseItem
                  key={item.rowNumber}
                  data={item}
                  onUpdate={onItemUpdate}
                  onDelete={onItemDelete}
                  canEdit={canEdit}
                />
              ))}
            </div>
          </div>
        </ExpenseLedgerState>
      </section>
    </div>
  );
}
