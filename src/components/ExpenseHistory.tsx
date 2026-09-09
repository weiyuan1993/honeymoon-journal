import { useMemo, useState } from 'react';
import type { ExpenseItem as ExpenseItemType, ExpenseOverviewData } from '@/types';
import { getCurrencySymbol, tripConfig } from '@/config/trip.config';
import ExpenseItem from './ExpenseItem';
import {
  ALL_EXPENSE_FILTER,
  aggregateExpensesByCurrency,
  convertExpenseTotalsToTwd,
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
  ratesTwdPerUnit: ExpenseOverviewData['ratesTwdPerUnit'] | null;
}

interface ExpenseHistoryProps {
  canEdit: boolean;
  model: ExpenseHistoryModel;
  onFiltersChange: (patch: Partial<ExpenseFilters>) => void;
  onItemUpdate: (updatedItem?: ExpenseItemType) => void;
  onItemDelete: (rowNumber: number) => void;
}

export default function ExpenseHistory({
  canEdit,
  model,
  onFiltersChange,
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
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const hasFilters = model.filters.category !== ALL_EXPENSE_FILTER;

  return (
    <div className="space-y-3">
      {model.warning ? (
        <ExpenseWarning>{model.warning}</ExpenseWarning>
      ) : null}

      {model.status === 'ready' && model.list.length > 0 ? (
        <div className="expense-surface space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-deep-blue">所有記帳</h2>
              <p className="mt-0.5 font-serif text-[13px] text-ink/45">
                {filtered.length} 筆紀錄
              </p>
            </div>
            <div className="space-y-1.5 text-right">
            <div className="flex flex-wrap justify-end gap-1.5">
              {Object.entries(totals).map(([currency, total]) => (
                <div
                  key={currency}
                  className="rounded-lg bg-deep-blue/5 px-2.5 py-1 text-right"
                >
                  <div className="font-serif text-xs leading-none text-ink/45">
                    {currency}
                  </div>
                  <div className="mt-0.5 font-display text-sm font-semibold tabular-nums text-deep-blue">
                    {getCurrencySymbol(currency)}{' '}
                    {expenseAmountFormatter.format(total)}
                  </div>
                </div>
              ))}
            </div>
            <TwdEstimate totals={totals} rates={model.ratesTwdPerUnit} />
            </div>
          </div>

          <div role="group" aria-label="花費類別" className="flex gap-2 overflow-x-auto py-1">
            {[{ code: ALL_EXPENSE_FILTER, label: '全部' }, ...tripConfig.categories].map((category) => (
              <button key={category.code} type="button"
                aria-pressed={model.filters.category === category.code}
                onClick={() => onFiltersChange({ category: category.code })}
                className={`min-h-10 shrink-0 rounded-full border px-4 text-sm transition-colors ${
                  model.filters.category === category.code
                    ? 'border-deep-blue bg-deep-blue text-white'
                    : 'border-deep-blue/10 bg-white text-deep-blue hover:bg-deep-blue/5'
                }`}>
                {category.label}
              </button>
            ))}
          </div>
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
          {groups.map((group, index) => {
            const dateKey = group.dateKey ?? 'other';
            const expanded = hasFilters || (expandedDates[dateKey] ?? index < 3);
            const dayTotals = aggregateExpensesByCurrency(group.items);
            return (
              <section key={dateKey} className="expense-surface overflow-hidden">
                <h3>
                  <button type="button" aria-expanded={expanded}
                    aria-controls={`expense-date-${dateKey}`}
                    disabled={hasFilters}
                    onClick={() => setExpandedDates((current) => ({ ...current, [dateKey]: !expanded }))}
                    className="flex w-full flex-wrap items-center justify-between gap-3 bg-deep-blue/3 px-4 py-3 text-left">
                    <span className="text-sm font-medium text-deep-blue">
                      {group.dateKey?.split('-').join('/') ?? '其他'}
                      <span className="ml-2 text-xs font-normal text-ink/55">{group.items.length} 筆</span>
                    </span>
                    <span className="flex items-center gap-2">
                    <span className="space-y-1 text-right">
                    <span className="flex flex-wrap justify-end gap-2 text-xs tabular-nums text-deep-blue">
                      {Object.entries(dayTotals).map(([currency, total]) => (
                        <span key={currency}>{currency} {expenseAmountFormatter.format(total)}</span>
                      ))}
                    </span>
                    <TwdEstimate totals={dayTotals} rates={model.ratesTwdPerUnit} />
                    </span>
                      <span aria-hidden="true" className="text-xs text-deep-blue">{expanded ? '−' : '＋'}</span>
                    </span>
                  </button>
                </h3>
                <div id={`expense-date-${dateKey}`} hidden={!expanded} className="divide-y divide-gray-100">
                  {expanded ? group.items.map((item) => (
                    <ExpenseItem key={item.rowNumber} data={item}
                      onUpdate={onItemUpdate} onDelete={onItemDelete} canEdit={canEdit} />
                  )) : null}
                </div>
              </section>
            );
          })}
        </div>
      </ExpenseLedgerState>
    </div>
  );
}

const twdFormatter = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 });

function TwdEstimate({ totals, rates }: {
  totals: Record<string, number>;
  rates: ExpenseOverviewData['ratesTwdPerUnit'] | null;
}) {
  const total = convertExpenseTotalsToTwd(totals, rates);
  return (
    <span className="block text-xs font-normal tabular-nums text-ink/50">
      {total === null ? '台幣換算暫無法提供' : `約 NT$ ${twdFormatter.format(total)}`}
    </span>
  );
}
