import type { ExpenseItem, ExpenseOverviewData } from '@/types';
import type { Category, Currency } from '@/config/trip.config';

export const ALL_EXPENSE_FILTER = 'all' as const;

export interface ExpenseFilters {
  searchTerm: string;
  category: Category | typeof ALL_EXPENSE_FILTER;
  currency: Currency | typeof ALL_EXPENSE_FILTER;
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

export const filterExpenses = (
  expenses: ExpenseItem[],
  filters: ExpenseFilters
): ExpenseItem[] => {
  const normalizedSearch = filters.searchTerm.trim().toLocaleLowerCase();
  return expenses.filter((expense) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      expense.item.toLocaleLowerCase().includes(normalizedSearch);
    const matchesCategory =
      filters.category === ALL_EXPENSE_FILTER ||
      expense.category === filters.category;
    const matchesCurrency =
      filters.currency === ALL_EXPENSE_FILTER ||
      expense.currency === filters.currency;
    return matchesSearch && matchesCategory && matchesCurrency;
  });
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
