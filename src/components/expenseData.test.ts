import { describe, expect, it } from 'vitest';
import type { ExpenseItem, ExpenseOverviewData } from '@/types';
import {
  aggregateExpensesByCurrency,
  filterExpenses,
  getExpenseOverviewDisplayMode,
  groupExpensesByDate,
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

describe('expense aggregation and filtering', () => {
  it('keeps invalid timestamps in the full history', () => {
    const invalid = expense(1, 'not-a-date', 9);

    expect(groupExpensesByDate([invalid])).toEqual([
      { dateKey: null, items: [invalid] },
    ]);
  });

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
