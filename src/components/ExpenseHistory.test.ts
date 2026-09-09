import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ExpenseHistory from './ExpenseHistory';
import type { ExpenseHistoryModel } from './ExpenseHistory';

const list = Array.from({ length: 30 }, (_, index) => ({
  rowNumber: index + 2,
  timestamp: new Date(2026, 9, index + 1, 12).toISOString(),
  item: `Coffee day ${index + 1}!`,
  amount: 10,
  currency: 'EUR' as const,
  category: 'Food' as const,
}));

function renderHistory(category: ExpenseHistoryModel['filters']['category'] = 'all') {
  const model: ExpenseHistoryModel = {
    list, status: 'ready', warning: null,
    filters: { category },
    ratesTwdPerUnit: { EUR: 36 },
  };
  return renderToStaticMarkup(
    createElement(ExpenseHistory, { canEdit: true, model, onFiltersChange: vi.fn(),
      onItemUpdate: vi.fn(), onItemDelete: vi.fn() })
  );
}

describe('expense history dates', () => {
  it('keeps all 30 date summaries but only renders the latest three days initially', () => {
    const html = renderHistory();
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(3);
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(27);
    expect(html).toContain('Coffee day 30!');
    expect(html).toContain('Coffee day 28!');
    expect(html).not.toContain('Coffee day 27!');
    expect(html).toContain('expense-date-2026-10-01');
    expect(html).toContain('約 NT$ 10,800');
    expect(html.match(/約 NT\$ 360</g)).toHaveLength(30);
  });

  it('exposes matching records from older dates when a category is selected', () => {
    const html = renderHistory('Food');
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(30);
    expect(html).toContain('Coffee day 1!');
    expect(html).toContain('Coffee day 30!');
  });
});
