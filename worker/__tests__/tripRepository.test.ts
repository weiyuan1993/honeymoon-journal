import { describe, expect, it, vi } from 'vitest';
import {
  parseExpensesGrid,
  parseItineraryGrid,
  parseReferenceLinks,
  parseTodosGrid,
  TripRepository,
} from '../tripRepository';

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
        { formattedValue: '2026/10/01 12:00', effectiveValue: { numberValue: 46396.5 } },
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
    expect(result[0].timestamp).toMatch(/^2027-/);
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
