import { describe, expect, it } from 'vitest';
import {
  parseExpensesGrid,
  parseItineraryGrid,
  parseReferenceLinks,
  parseTodosGrid,
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
      { rowNumber: 1, cells: [{ formattedValue: '區段' }, { formattedValue: '項目' }] },
      { rowNumber: 2, cells: [{ formattedValue: '出發前' }] },
      {
        rowNumber: 3,
        cells: [
          {},
          { formattedValue: '買車票' },
          { formattedValue: '官網' },
          { formattedValue: '8/1' },
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
      done: true,
    });
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
