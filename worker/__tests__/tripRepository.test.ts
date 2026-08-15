import { describe, expect, it, vi } from 'vitest';
import {
  buildExpenseOverview,
  parseExpensePlanGrid,
  parseExpensesGrid,
  parseItineraryGrid,
  parseReferenceLinks,
  parseTodosGrid,
  TripRepository,
} from '../tripRepository';
import type { GridCell } from '../richText';

function expensePlanFixture(): Array<{ rowNumber: number; cells: GridCell[] }> {
  const rows = Array.from({ length: 40 }, (_, index) => ({
    rowNumber: index + 3,
    cells: [] as GridCell[],
  }));
  const put = (
    rowNumber: number,
    column: number,
    formattedValue: string,
    effectiveValue?: GridCell['effectiveValue']
  ) => {
    rows[rowNumber - 3].cells[column] = { formattedValue, effectiveValue };
  };
  const amount = (rowNumber: number, column: number, value: number) =>
    put(rowNumber, column, `€${value * 100}`, { numberValue: value });
  const paid = (rowNumber: number, column: number, value: boolean) =>
    put(rowNumber, column, value ? 'TRUE' : 'FALSE', { boolValue: value });

  put(3, 0, '費用估算（一人）');
  put(3, 2, '費用 EUR');
  put(3, 5, '🏠 城市（29晚，雙人房平分）');
  put(3, 12, '已付款');
  put(3, 15, '🏔️景點門票');
  put(3, 16, '費用');
  put(3, 17, '已付款');
  put(16, 5, '✈️ 交通');
  put(16, 6, '一人費用');
  put(16, 7, '已付款');
  put(16, 9, '🍕飲食（30天）');
  put(16, 12, '總額');
  put(16, 13, '已付款');
  put(23, 0, '貨幣');
  put(23, 1, '兌台幣匯率');

  [
    [4, '住宿', 100],
    [5, '交通', 20],
    [6, '簽證', 5],
    [7, '交通', 30],
    [8, '交通', 10],
    [9, '門票', 40],
    [10, '門票', 0],
    [11, '門票', 0],
    [12, '門票', 0],
    [13, '飲食', 50],
  ].forEach(([rowNumber, category, value]) => {
    put(rowNumber as number, 0, category as string);
    amount(rowNumber as number, 2, value as number);
  });

  put(24, 0, 'CHF');
  amount(24, 1, 40);
  put(25, 0, 'EUR');
  amount(25, 1, 35);
  put(26, 0, 'GBP');
  amount(26, 1, 43);

  [4, 5, 6, 7, 8, 9, 10, 11, 12].forEach((rowNumber) => {
    put(rowNumber, 5, `Hotel ${rowNumber}`);
    amount(rowNumber, 11, 0);
    paid(rowNumber, 12, false);
  });
  [
    17, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
    32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
  ].forEach((rowNumber) => {
    put(rowNumber, 5, `Transport ${rowNumber}`);
    amount(rowNumber, 6, 0);
    paid(rowNumber, 7, false);
  });
  [
    5, 6, 9, 10, 11, 12, 15, 16, 17, 18,
    19, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  ].forEach((rowNumber) => {
    put(rowNumber, 15, `Ticket ${rowNumber}`);
    amount(rowNumber, 16, 0);
    paid(rowNumber, 17, false);
  });
  [17, 18, 19].forEach((rowNumber) => {
    put(rowNumber, 9, `Meal ${rowNumber}`);
    amount(rowNumber, 12, 0);
    paid(rowNumber, 13, false);
  });

  put(4, 5, 'London');
  amount(4, 11, 200);
  paid(4, 12, true);
  put(17, 5, 'Flight');
  amount(17, 6, 20);
  paid(17, 7, true);
  put(18, 5, 'Visa - UK ETA');
  amount(18, 6, 5);
  paid(18, 7, false);
  put(20, 5, 'Train');
  amount(20, 6, 30);
  paid(20, 7, false);
  put(17, 9, 'Breakfast');
  amount(17, 12, 50);
  paid(17, 13, false);
  put(5, 15, 'Abbey');
  amount(5, 16, 40);
  paid(5, 17, true);

  return rows;
}

describe('trip repository parsers', () => {
  it('preserves physical itinerary row numbers when blank rows exist', () => {
    const result = parseItineraryGrid([
      { rowNumber: 2, cells: [{ formattedValue: 'Day 1' }, { formattedValue: '9/28' }] },
      { rowNumber: 3, cells: [] },
      { rowNumber: 4, cells: [{ formattedValue: 'Day 2' }, { formattedValue: '9/29' }] },
    ]);

    expect(result.map((item) => item.rowNumber)).toEqual([2, 4]);
  });

  it('tracks todo section rows and stops before the link appendix', () => {
    const result = parseTodosGrid([
      {
        rowNumber: 1,
        cells: [
          { formattedValue: '區段' },
          { formattedValue: '項目' },
          { formattedValue: '細節' },
          { formattedValue: '截止建議' },
          { formattedValue: '狀態' },
          { formattedValue: '連結' },
        ],
      },
      { rowNumber: 2, cells: [{ formattedValue: '出發前' }] },
      {
        rowNumber: 3,
        cells: [
          {},
          { formattedValue: '買車票' },
          { formattedValue: '官網' },
          {},
          { formattedValue: 'TRUE', effectiveValue: { boolValue: true } },
        ],
      },
      { rowNumber: 4, cells: [{ formattedValue: '【重要連結彙整】' }] },
      { rowNumber: 5, cells: [{}, { formattedValue: '不可出現' }] },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      rowNumber: 3,
      section: '出發前',
      item: '買車票',
      links: [],
      done: true,
    });
  });

  it('returns every safe link from the todo link column', () => {
    const result = parseTodosGrid([
      {
        rowNumber: 1,
        cells: [
          { formattedValue: '區段' },
          { formattedValue: '項目' },
          { formattedValue: '細節' },
          { formattedValue: '狀態' },
          { formattedValue: '連結' },
        ],
      },
      { rowNumber: 2, cells: [{ formattedValue: '出發前' }] },
      {
        rowNumber: 3,
        cells: [
          {},
          { formattedValue: '訂門票' },
          {},
          {},
          { formattedValue: '官方預約', hyperlink: 'https://example.com/book' },
        ],
      },
      {
        rowNumber: 4,
        cells: [
          {},
          { formattedValue: '直接貼網址' },
          {},
          {},
          { formattedValue: 'https://example.com/direct' },
        ],
      },
      {
        rowNumber: 5,
        cells: [
          {},
          { formattedValue: '不安全連結' },
          {},
          {},
          { formattedValue: 'javascript:alert(1)' },
        ],
      },
      {
        rowNumber: 6,
        cells: [
          {},
          { formattedValue: '文字超連結' },
          {},
          {},
          {
            formattedValue: '官方預約',
            textFormatRuns: [{
              startIndex: 0,
              format: { link: { uri: 'https://example.com/rich-text' } },
            }],
          },
        ],
      },
      {
        rowNumber: 7,
        cells: [
          {},
          { formattedValue: '多筆訂票連結' },
          {},
          {},
          {
            formattedValue: '第一段訂票\n第二段訂票',
            textFormatRuns: [
              {
                format: { link: { uri: 'https://example.com/first' } },
              },
              {
                startIndex: 6,
                format: { link: { uri: 'https://example.com/second' } },
              },
            ],
          },
        ],
      },
    ]);

    expect(result.map(({ rowNumber, links }) => ({ rowNumber, links }))).toEqual([
      {
        rowNumber: 3,
        links: [{ label: '官方預約', url: 'https://example.com/book' }],
      },
      {
        rowNumber: 4,
        links: [{ label: '訂票連結 1', url: 'https://example.com/direct' }],
      },
      { rowNumber: 5, links: [] },
      {
        rowNumber: 6,
        links: [{ label: '官方預約', url: 'https://example.com/rich-text' }],
      },
      {
        rowNumber: 7,
        links: [
          { label: '第一段訂票', url: 'https://example.com/first' },
          { label: '第二段訂票', url: 'https://example.com/second' },
        ],
      },
    ]);
  });

  it('keeps the legacy deadline in detail and reads its link column', () => {
    const result = parseTodosGrid([
      {
        rowNumber: 1,
        cells: [
          { formattedValue: '【待辦事項 - 依優先順序】' },
          { formattedValue: '項目' },
          { formattedValue: '細節' },
          { formattedValue: '截止建議' },
          { formattedValue: '狀態' },
          { formattedValue: '連結' },
        ],
      },
      { rowNumber: 2, cells: [{ formattedValue: '最優先' }] },
      {
        rowNumber: 3,
        cells: [
          {},
          { formattedValue: '機票選位' },
          { formattedValue: '提前確認座位' },
          { formattedValue: '出發前兩天' },
          { formattedValue: 'TRUE', effectiveValue: { boolValue: true } },
          { formattedValue: '航空公司官網', hyperlink: 'https://example.com/seat' },
        ],
      },
    ]);

    expect(result).toEqual([{
      rowNumber: 3,
      section: '最優先',
      item: '機票選位',
      detail: '提前確認座位<br>期限／狀態：出發前兩天',
      links: [{ label: '航空公司官網', url: 'https://example.com/seat' }],
      done: true,
    }]);
  });

  it('preserves structured URL punctuation and trims prose punctuation', () => {
    const result = parseTodosGrid([
      {
        rowNumber: 1,
        cells: [
          { formattedValue: '區段' },
          { formattedValue: '項目' },
          { formattedValue: '細節' },
          { formattedValue: '狀態' },
          { formattedValue: '連結' },
        ],
      },
      { rowNumber: 2, cells: [{ formattedValue: '出發前' }] },
      {
        rowNumber: 3,
        cells: [
          {},
          { formattedValue: '官方連結' },
          {},
          {},
          { formattedValue: '官方預約', hyperlink: 'https://example.com/book)' },
        ],
      },
      {
        rowNumber: 4,
        cells: [
          {},
          { formattedValue: '直接貼網址' },
          {},
          {},
          { formattedValue: '請開啟 https://example.com/direct).' },
        ],
      },
    ]);

    expect(result.map(({ rowNumber, links }) => ({ rowNumber, links }))).toEqual([
      {
        rowNumber: 3,
        links: [{ label: '官方預約', url: 'https://example.com/book)' }],
      },
      {
        rowNumber: 4,
        links: [{ label: '請開啟', url: 'https://example.com/direct' }],
      },
    ]);
  });

  it('writes todo completion to the legacy status column', async () => {
    const updateValues = vi.fn().mockResolvedValue(undefined);
    const batchGetValues = vi.fn().mockResolvedValue([
      [['區段', '項目', '細節', '截止建議', '狀態', '連結']],
      [['買車票']],
    ]);
    const repository = new TripRepository({
      batchGetValues,
      updateValues,
    } as never);

    await repository.updateTodoStatus(3, true, '買車票');

    expect(updateValues).toHaveBeenCalledWith('待辦!E3:E3', [[true]]);
  });

  it('writes todo completion to the compact status column', async () => {
    const updateValues = vi.fn().mockResolvedValue(undefined);
    const batchGetValues = vi.fn().mockResolvedValue([
      [['區段', '項目', '細節', '狀態', '連結']],
      [['買車票']],
    ]);
    const repository = new TripRepository({
      batchGetValues,
      updateValues,
    } as never);

    await repository.updateTodoStatus(3, true, '買車票');

    expect(updateValues).toHaveBeenCalledWith('待辦!D3:D3', [[true]]);
  });

  it('uses unformatted numeric values for expense totals', () => {
    const result = parseExpensesGrid([{
      rowNumber: 8,
      cells: [
        {
          formattedValue: '2025/12/30 下午 9:41:15',
          effectiveValue: { numberValue: 46021.903645833336 },
        },
        { formattedValue: 'Dinner' },
        { formattedValue: '€1,234.50', effectiveValue: { numberValue: 1234.5 } },
        { formattedValue: 'EUR' },
        { formattedValue: 'Food' },
      ],
    }]);

    expect(result[0]).toMatchObject({
      rowNumber: 8,
      item: 'Dinner',
      amount: 1234.5,
      currency: 'EUR',
    });
    expect(result[0].timestamp).toBe('2025-12-30T13:41:15.000Z');
  });

  it('normalizes the fee plan to two-person totals and uses effective numbers', () => {
    const result = parseExpensePlanGrid(expensePlanFixture());

    expect(result.categories).toEqual([
      {
        category: '住宿',
        currency: 'EUR',
        amount: 200,
        paidAmount: 200,
        unpaidAmount: 0,
        amountTwd: 7000,
        paidAmountTwd: 7000,
        unpaidAmountTwd: 0,
      },
      {
        category: '交通',
        currency: 'EUR',
        amount: 120,
        paidAmount: 40,
        unpaidAmount: 80,
        amountTwd: 4200,
        paidAmountTwd: 1400,
        unpaidAmountTwd: 2800,
      },
      {
        category: '簽證',
        currency: 'EUR',
        amount: 10,
        paidAmount: 0,
        unpaidAmount: 10,
        amountTwd: 350,
        paidAmountTwd: 0,
        unpaidAmountTwd: 350,
      },
      {
        category: '門票',
        currency: 'EUR',
        amount: 80,
        paidAmount: 80,
        unpaidAmount: 0,
        amountTwd: 2800,
        paidAmountTwd: 2800,
        unpaidAmountTwd: 0,
      },
      {
        category: '飲食',
        currency: 'EUR',
        amount: 100,
        paidAmount: 0,
        unpaidAmount: 100,
        amountTwd: 3500,
        paidAmountTwd: 0,
        unpaidAmountTwd: 3500,
      },
    ]);
    expect(result.warnings).not.toEqual(
      expect.arrayContaining([expect.stringContaining('簽證')])
    );
    expect(result.isComplete).toBe(true);
  });

  it('reconciles headline totals before rounding category display amounts', () => {
    const rows = expensePlanFixture();
    rows[4 - 3].cells[2] = {
      formattedValue: '€100.00',
      effectiveValue: { numberValue: 100.004 },
    };
    rows[4 - 3].cells[11] = {
      formattedValue: '€200.00',
      effectiveValue: { numberValue: 200.004 },
    };

    const result = parseExpensePlanGrid(rows);
    const overview = buildExpenseOverview(result, []);

    expect(result.projectedTwd).toBe(17850.28);
    expect(result.paidTwd).toBe(11200.14);
    expect(result.unpaidTwd).toBe(6650.14);
    expect(overview.totals.projectedTwd).toBe(17850.28);
    expect(overview.totals.paidTwd).toBe(11200.14);
    expect(overview.totals.unpaidTwd).toBe(6650.14);
    expect(overview.warnings).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining('無法對帳'),
      ])
    );
    expect(overview.isComplete).toBe(true);
  });

  it('moves a budget amount from unpaid to paid without changing projected total', () => {
    const before = parseExpensePlanGrid(expensePlanFixture());
    const changed = expensePlanFixture();
    changed[20 - 3].cells[7] = {
      formattedValue: 'TRUE',
      effectiveValue: { boolValue: true },
    };
    const after = parseExpensePlanGrid(changed);

    expect(after.projectedTwd).toBe(before.projectedTwd);
    expect(before.paidTwd).toBe(11200);
    expect(after.paidTwd).toBe(13300);
    expect(before.unpaidTwd).toBe(6650);
    expect(after.unpaidTwd).toBe(4550);
  });

  it('uses the ETA row in the transport table as the visa payment state', () => {
    const before = parseExpensePlanGrid(expensePlanFixture());
    const changed = expensePlanFixture();
    changed[18 - 3].cells[7] = {
      formattedValue: 'TRUE',
      effectiveValue: { boolValue: true },
    };
    const after = parseExpensePlanGrid(changed);

    expect(before.categories.find(({ category }) => category === '簽證'))
      .toMatchObject({ amount: 10, paidAmount: 0, unpaidAmount: 10 });
    expect(after.categories.find(({ category }) => category === '簽證'))
      .toMatchObject({ amount: 10, paidAmount: 10, unpaidAmount: 0 });
    expect(after.projectedTwd).toBe(before.projectedTwd);
    expect(after.paidTwd).toBe((before.paidTwd ?? 0) + 350);
    expect(after.unpaidTwd).toBe((before.unpaidTwd ?? 0) - 350);
  });

  it('keeps a missing paid checkbox unpaid and reports the ambiguity', () => {
    const rows = expensePlanFixture();
    rows[20 - 3].cells[7] = {};

    const result = parseExpensePlanGrid(rows);
    const transport = result.categories.find(
      ({ category }) => category === '交通'
    );

    expect(transport).toMatchObject({
      amount: 120,
      paidAmount: 40,
      unpaidAmount: 80,
    });
    expect(result.isComplete).toBe(false);
    expect(result.warnings).toContain(
      '交通第 20 列未設定已付款，暫列為未付款'
    );
  });

  it('rejects required layout anchor drift', () => {
    const rows = expensePlanFixture();
    rows[0].cells[5] = { formattedValue: 'unexpected' };

    expect(() => parseExpensePlanGrid(rows)).toThrow(
      '費用版面不符預期'
    );
  });

  it('marks invalid rates and paid totals above their category as incomplete', () => {
    const rows = expensePlanFixture();
    rows[25 - 3].cells[1] = {
      formattedValue: '0',
      effectiveValue: { numberValue: 0 },
    };
    rows[5 - 3].cells[16] = {
      formattedValue: '€140',
      effectiveValue: { numberValue: 140 },
    };

    const result = parseExpensePlanGrid(rows);

    expect(result.isComplete).toBe(false);
    expect(result.unconvertedCurrencies).toContain('EUR');
    expect(result.projectedTwd).toBeNull();
    expect(result.categories.find(({ category }) => category === '門票'))
      .toMatchObject({ amount: 80, paidAmount: 280, unpaidAmount: -200 });
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('EUR 匯率'),
        expect.stringContaining('門票已付款金額高於分類總額'),
      ])
    );
  });

  it('combines every ledger entry and reports unknown currencies without a partial total', () => {
    const plan = parseExpensePlanGrid(expensePlanFixture());
    const result = buildExpenseOverview(
      plan,
      [
        {
          rowNumber: 2,
          timestamp: '2026-07-31T01:00:00.000Z',
          item: 'Lunch',
          amount: 10,
          currency: 'EUR',
          category: 'Food',
        },
        {
          rowNumber: 3,
          timestamp: '2026-07-31T02:00:00.000Z',
          item: 'Unknown',
          amount: 3,
          currency: 'JPY',
          category: 'Other',
        },
      ],
      '2026-07-31T03:00:00.000Z'
    );

    expect(result.ledgerByCurrency).toEqual([
      { currency: 'EUR', amount: 10, amountTwd: 350 },
      { currency: 'JPY', amount: 3, amountTwd: null },
    ]);
    expect(result.components.ledgerTwd).toBeNull();
    expect(result.totals.projectedTwd).toBeNull();
    expect(result.unconvertedCurrencies).toContain('JPY');
    expect(result.isComplete).toBe(false);
  });

  it('rejects malformed ledger rows from the parsed expense overview', () => {
    const rows = [
      {
        rowNumber: 2,
        cells: [
          { formattedValue: '2026/7/31' },
          { formattedValue: 'Lunch' },
          { formattedValue: '10', effectiveValue: { numberValue: 10 } },
          { formattedValue: 'EUR' },
          { formattedValue: 'Food' },
        ],
      },
      {
        rowNumber: 3,
        cells: [
          { formattedValue: '2026/7/31' },
          { formattedValue: 'Malformed amount' },
          { formattedValue: 'not-a-number' },
          { formattedValue: 'EUR' },
          { formattedValue: 'Other' },
        ],
      },
      {
        rowNumber: 4,
        cells: [
          { formattedValue: '2026/7/31' },
          { formattedValue: 'Blank amount' },
          {},
          { formattedValue: 'EUR' },
          { formattedValue: 'Other' },
        ],
      },
      {
        rowNumber: 5,
        cells: [
          { formattedValue: '2026/7/31' },
          { formattedValue: 'Blank currency' },
          { formattedValue: '20', effectiveValue: { numberValue: 20 } },
          {},
          { formattedValue: 'Other' },
        ],
      },
    ];
    const expenses = parseExpensesGrid(rows, { strictAmounts: true });

    expect(parseExpensesGrid(rows).find(({ rowNumber }) => rowNumber === 3)?.amount)
      .toBe(0);
    expect(
      expenses
        .filter(({ rowNumber }) => rowNumber === 3 || rowNumber === 4)
        .every(({ amount }) => !Number.isFinite(amount))
    ).toBe(true);

    const result = buildExpenseOverview(
      parseExpensePlanGrid(expensePlanFixture()),
      expenses
    );

    expect(result.ledgerByCurrency).toEqual([
      { currency: 'EUR', amount: 10, amountTwd: 350 },
    ]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        '記帳第 3 列的幣別或金額無效',
        '記帳第 4 列的幣別或金額無效',
        '記帳第 5 列的幣別或金額無效',
      ])
    );
    expect(result.isComplete).toBe(false);
  });

  it('groups valid reference links under the latest country heading', () => {
    const result = parseReferenceLinks([
      ['英國'],
      ['項目', '連結', '備註'],
      ['倫敦地鐵地圖', 'https://tfl.gov.uk/map', '官方地鐵圖'],
      ['法國'],
      ['項目', '連結', '備註'],
      ['只有文字的備忘錄'],
      [
        '巴黎地鐵',
        'https://ratp.fr/map',
        '博物館通票預約',
        'https://parismuseumpass.fr/reservation',
      ],
      ['無效連結', 'javascript:alert(1)'],
    ]);

    expect(result).toEqual([
      {
        category: '英國',
        label: '倫敦地鐵地圖',
        url: 'https://tfl.gov.uk/map',
        note: '官方地鐵圖',
      },
      {
        category: '法國',
        label: '巴黎地鐵',
        url: 'https://ratp.fr/map',
      },
      {
        category: '法國',
        label: '博物館通票預約',
        url: 'https://parismuseumpass.fr/reservation',
      },
    ]);
  });

  it('deduplicates URLs and keeps uncategorized links under other', () => {
    const result = parseReferenceLinks([
      ['官方網站', 'https://example.com'],
      ['重複網站', 'https://example.com'],
    ]);

    expect(result).toEqual([
      {
        category: '其他',
        label: '官方網站',
        url: 'https://example.com',
      },
    ]);
  });
});
