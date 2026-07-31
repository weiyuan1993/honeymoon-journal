import { describe, expect, it } from 'vitest';
import type { ExpenseItem, ExpenseOverviewData } from '@/types';
import {
  aggregateExpensesByCurrency,
  filterExpenses,
  getExpenseOverviewDisplayMode,
  getLocalDateKey,
  groupExpensesByDate,
  selectTodayExpenses,
} from './expenseData';

const expense = (
  rowNumber: number,
  timestamp: string,
  amount: number,
  currency: ExpenseItem['currency'] = 'EUR',
  category: ExpenseItem['category'] = 'Food',
  item = `Expense ${rowNumber}`
): ExpenseItem => ({
  rowNumber,
  timestamp,
  item,
  amount,
  currency,
  category,
});

const completeOverview = (): ExpenseOverviewData => ({
  fetchedAt: '2026-07-31T08:00:00.000Z',
  ratesTwdPerUnit: { EUR: 35, CHF: 37, GBP: 41, TWD: 1 },
  categories: [],
  ledgerByCurrency: [],
  components: {
    budgetProjectedTwd: 100_000,
    budgetPaidTwd: 60_000,
    budgetUnpaidTwd: 40_000,
    ledgerTwd: 5_000,
  },
  totals: {
    projectedTwd: 105_000,
    paidTwd: 65_000,
    unpaidTwd: 40_000,
  },
  warnings: [],
  unconvertedCurrencies: [],
  isComplete: true,
});

describe('expense local-day helpers', () => {
  it('builds date keys from the device-local calendar date', () => {
    expect(getLocalDateKey(new Date(2026, 6, 31, 23, 59, 59))).toBe(
      '2026-07-31'
    );
    expect(getLocalDateKey(new Date(2026, 7, 1, 0, 0, 0))).toBe(
      '2026-08-01'
    );
  });

  it('selects only valid timestamps from today', () => {
    const items = [
      expense(1, new Date(2026, 6, 31, 8).toISOString(), 12),
      expense(2, new Date(2026, 6, 30, 23, 59).toISOString(), 5),
      expense(3, 'not-a-date', 7),
    ];

    expect(
      selectTodayExpenses(items, new Date(2026, 6, 31, 22))
        .map((item) => item.rowNumber)
    ).toEqual([1]);
  });

  it('keeps invalid timestamps in history while excluding them from today', () => {
    const invalid = expense(1, 'not-a-date', 9);

    expect(selectTodayExpenses([invalid], new Date(2026, 6, 31))).toEqual([]);
    expect(groupExpensesByDate([invalid])).toEqual([
      { dateKey: null, items: [invalid] },
    ]);
  });
});

describe('expense aggregation and filtering', () => {
  it('aggregates EUR and CHF independently', () => {
    expect(
      aggregateExpensesByCurrency([
        expense(1, '2026-07-31T08:00:00+08:00', 10, 'EUR'),
        expense(2, '2026-07-31T09:00:00+08:00', 5, 'EUR'),
        expense(3, '2026-07-31T10:00:00+08:00', 20, 'CHF'),
      ])
    ).toEqual({ EUR: 15, CHF: 20 });
  });

  it('applies search, category, and currency filters conjunctively', () => {
    const items = [
      expense(1, '2026-07-31T08:00:00+08:00', 10, 'EUR', 'Food', 'Dinner'),
      expense(
        2,
        '2026-07-31T09:00:00+08:00',
        20,
        'CHF',
        'Food',
        'Dinner'
      ),
      expense(
        3,
        '2026-07-31T10:00:00+08:00',
        30,
        'EUR',
        'Transport',
        'Dinner train'
      ),
      expense(4, '2026-07-31T11:00:00+08:00', 40, 'EUR', 'Food', 'Lunch'),
    ];

    expect(
      filterExpenses(items, {
        searchTerm: 'dinner',
        category: 'Food',
        currency: 'EUR',
      }).map((item) => item.rowNumber)
    ).toEqual([1]);
  });
});

describe('expense overview display mode', () => {
  it('distinguishes complete, incomplete, and unavailable overview data', () => {
    expect(getExpenseOverviewDisplayMode(completeOverview())).toBe('complete');
    expect(
      getExpenseOverviewDisplayMode({
        ...completeOverview(),
        isComplete: false,
        totals: {
          projectedTwd: null,
          paidTwd: 65_000,
          unpaidTwd: 40_000,
        },
      })
    ).toBe('incomplete');
    expect(getExpenseOverviewDisplayMode(null)).toBe('unavailable');
  });
});
