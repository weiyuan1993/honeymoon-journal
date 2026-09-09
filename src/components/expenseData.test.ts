import { describe, expect, it } from 'vitest';
import type { ExpenseItem, ExpenseOverviewData } from '@/types';
import {
  aggregateExpensesByCurrency,
  convertExpenseTotalsToTwd,
  filterExpenses,
  getExpenseOverviewDisplayMode,
  groupExpensesByDate,
} from './expenseData';

describe('ledger TWD estimates', () => {
  it('combines currencies at the supplied Sheet rates without rounding each subtotal', () => {
    expect(convertExpenseTotalsToTwd({ EUR: 10.5, CHF: 2, GBP: 3, TWD: 100 },
      { EUR: 36.65183, CHF: 39.1819437, GBP: 42.64789007 }))
      .toBeCloseTo(10.5 * 36.65183 + 2 * 39.1819437 + 3 * 42.64789007 + 100);
  });

  it('does not show a partial total when a required rate is missing or invalid', () => {
    for (const rate of [null, 0, -1, NaN, Infinity]) {
      expect(convertExpenseTotalsToTwd({ EUR: 10, GBP: 1 }, { EUR: 36, GBP: rate })).toBeNull();
    }
    expect(convertExpenseTotalsToTwd({ EUR: 10 }, null)).toBeNull();
    expect(convertExpenseTotalsToTwd({ TWD: 100 }, null)).toBe(100);
  });
});

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

  it('filters by category across item names and currencies', () => {
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
        category: 'Food',
      }).map((item) => item.rowNumber)
    ).toEqual([1, 2, 4]);
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
