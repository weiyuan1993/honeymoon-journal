import type { ExpenseItem, ExpenseOverviewData } from '@/types';
import type { Category } from '@/config/trip.config';

export const ALL_EXPENSE_FILTER = 'all' as const;

export interface ExpenseFilters {
  category: Category | typeof ALL_EXPENSE_FILTER;
}

export interface ExpenseDateGroup {
  dateKey: string | null;
  items: ExpenseItem[];
}

export type ExpenseOverviewDisplayMode =
  | 'complete'
  | 'incomplete'
  | 'unavailable';

const getLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTimestampDateKey = (timestamp: string): string | null => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : getLocalDateKey(date);
};

export const aggregateExpensesByCurrency = (
  expenses: ExpenseItem[]
): Record<string, number> =>
  expenses.reduce<Record<string, number>>((totals, expense) => {
    const amount = Number(expense.amount);
    if (!Number.isFinite(amount)) return totals;
    totals[expense.currency] = (totals[expense.currency] ?? 0) + amount;
    return totals;
  }, {});

export const convertExpenseTotalsToTwd = (
  totals: Record<string, number>,
  rates: ExpenseOverviewData['ratesTwdPerUnit'] | null
): number | null => {
  let result = 0;
  for (const [currency, amount] of Object.entries(totals)) {
    const rate = currency === 'TWD' ? 1 : rates?.[currency];
    if (rate == null || !Number.isFinite(rate) || rate <= 0 || !Number.isFinite(amount)) return null;
    result += amount * rate;
  }
  return Number.isFinite(result) ? result : null;
};

export const filterExpenses = (
  expenses: ExpenseItem[],
  filters: ExpenseFilters
): ExpenseItem[] => {
  return expenses.filter((expense) =>
    filters.category === ALL_EXPENSE_FILTER || expense.category === filters.category
  );
};

export const groupExpensesByDate = (
  expenses: ExpenseItem[]
): ExpenseDateGroup[] => {
  const groups = expenses.reduce<Map<string | null, ExpenseItem[]>>(
    (groupMap, expense) => {
      const dateKey = getTimestampDateKey(expense.timestamp);
      const items = groupMap.get(dateKey) ?? [];
      items.push(expense);
      groupMap.set(dateKey, items);
      return groupMap;
    },
    new Map()
  );

  return [...groups.entries()]
    .sort(([left], [right]) => {
      if (left === null) return 1;
      if (right === null) return -1;
      return right.localeCompare(left);
    })
    .map(([dateKey, items]) => ({ dateKey, items }));
};

export const getExpenseOverviewDisplayMode = (
  overview: ExpenseOverviewData | null
): ExpenseOverviewDisplayMode => {
  if (!overview) return 'unavailable';
  const totalsAreComplete = Object.values(overview.totals).every(
    (value) => value !== null && Number.isFinite(value)
  );
  return overview.isComplete && totalsAreComplete ? 'complete' : 'incomplete';
};
