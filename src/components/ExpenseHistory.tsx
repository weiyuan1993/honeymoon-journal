import { useMemo } from 'react';
import type { ExpenseItem as ExpenseItemType } from '@/types';
import type { Category, Currency } from '@/config/trip.config';
import { getCurrencySymbol, tripConfig } from '@/config/trip.config';
import ExpenseItem from './ExpenseItem';
import {
  ALL_EXPENSE_FILTER,
  aggregateExpensesByCurrency,
  filterExpenses,
  groupExpensesByDate,
} from './expenseData';
import type { ExpenseFilters } from './expenseData';
import {
  expenseAmountFormatter,
  ExpenseLedgerState,
  ExpenseWarning,
  type LoadStatus,
} from './expenseUi';

export interface ExpenseHistoryModel {
  list: ExpenseItemType[];
  status: LoadStatus;
  warning: string | null;
  filters: ExpenseFilters;
  showAll: boolean;
}

interface ExpenseHistoryProps {
  canEdit: boolean;
  model: ExpenseHistoryModel;
  onFiltersChange: (patch: Partial<ExpenseFilters>) => void;
  onToggleShowAll: () => void;
  onItemUpdate: (updatedItem?: ExpenseItemType) => void;
  onItemDelete: (rowNumber: number) => void;
}

export default function ExpenseHistory({
  canEdit,
  model,
  onFiltersChange,
  onToggleShowAll,
  onItemUpdate,
  onItemDelete,
}: ExpenseHistoryProps) {
  const filtered = useMemo(
    () => filterExpenses(model.list, model.filters),
    [model.filters, model.list]
  );
  const totals = useMemo(
    () => aggregateExpensesByCurrency(filtered),
    [filtered]
  );
  const groups = useMemo(() => groupExpensesByDate(filtered), [filtered]);
  const displayGroups = model.showAll ? groups : groups.slice(0, 3);
  const hasMore = groups.length > 3;
  const hasFilters =
    model.filters.searchTerm.length > 0 ||
    model.filters.category !== ALL_EXPENSE_FILTER ||
    model.filters.currency !== ALL_EXPENSE_FILTER;

  return (
    <div className="space-y-3">
      {model.warning ? (
        <ExpenseWarning>{model.warning}</ExpenseWarning>
      ) : null}

      {model.status === 'ready' && model.list.length > 0 ? (
        <div className="space-y-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-sm text-ink/80">所有記帳</h2>
              <p className="mt-0.5 font-serif text-[13px] text-ink/45">
                {filtered.length} 筆紀錄
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              {Object.entries(totals).map(([currency, total]) => (
                <div
                  key={currency}
                  className="rounded-lg bg-gold/10 px-2.5 py-1 text-right"
                >
                  <div className="font-serif text-xs leading-none text-ink/45">
                    {currency}
                  </div>
                  <div className="mt-0.5 font-display text-sm font-bold text-gold">
                    {getCurrencySymbol(currency)}{' '}
                    {expenseAmountFormatter.format(total)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={model.filters.searchTerm}
                onChange={(event) =>
                  onFiltersChange({ searchTerm: event.target.value })
                }
                placeholder="搜尋項目..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 font-serif text-sm transition-colors focus:border-gold focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={model.filters.category}
                onChange={(event) =>
                  onFiltersChange({
                    category: event.target.value as
                      | Category
                      | typeof ALL_EXPENSE_FILTER,
                  })
                }
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-serif text-sm transition-colors focus:border-gold focus:outline-none"
              >
                <option value={ALL_EXPENSE_FILTER}>所有類別</option>
                {tripConfig.categories.map((category) => (
                  <option key={category.code} value={category.code}>
                    {category.label}
                  </option>
                ))}
              </select>
              <select
                value={model.filters.currency}
                onChange={(event) =>
                  onFiltersChange({
                    currency: event.target.value as
                      | Currency
                      | typeof ALL_EXPENSE_FILTER,
                  })
                }
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-serif text-sm transition-colors focus:border-gold focus:outline-none"
              >
                <option value={ALL_EXPENSE_FILTER}>所有貨幣</option>
                {tripConfig.currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasFilters ? (
            <button
              type="button"
              onClick={() =>
                onFiltersChange({
                  searchTerm: '',
                  category: ALL_EXPENSE_FILTER,
                  currency: ALL_EXPENSE_FILTER,
                })
              }
              className="text-xs text-gold transition-colors hover:text-gold/70"
            >
              ✕ 清除篩選
            </button>
          ) : null}
        </div>
      ) : null}

      <ExpenseLedgerState
        status={model.status}
        isEmpty={filtered.length === 0}
        emptyText={
          model.list.length === 0 ? '暫無花費紀錄' : '無符合條件的紀錄'
        }
      >
        <div className="space-y-2.5">
          {displayGroups.map((group) => (
            <div
              key={group.dateKey ?? 'other'}
              className="overflow-hidden rounded-lg bg-white shadow-sm"
            >
              <div className="border-b border-gold/10 bg-gradient-to-r from-gold/5 to-transparent px-3 py-1.5">
                <h3 className="font-display text-xs text-ink/60">
                  {group.dateKey?.split('-').join('/') ?? '其他'}
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {group.items.map((item) => (
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
          ))}
          {hasMore ? (
            <button
              type="button"
              onClick={onToggleShowAll}
              className="w-full rounded-sm border border-gold py-2 text-center font-serif text-sm text-gold transition-colors hover:text-wax"
            >
              {model.showAll
                ? '收起'
                : `顯示更多 (${groups.length - 3} 天)`}
            </button>
          ) : null}
        </div>
      </ExpenseLedgerState>
    </div>
  );
}
