import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TicketItem } from '@/types';
import TicketVaultPage from './TicketVaultPage';

const tickets: TicketItem[] = [
  {
    rowNumber: 2,
    day: 'Day 1',
    date: '2026-09-28',
    city: '英國',
    item: '機票 - Vic',
    type: '交通',
    provider: 'Emirates',
    fileUrl: 'https://drive.google.com/file/d/first/view',
    notes: '',
  },
  {
    rowNumber: 3,
    day: 'Day 2',
    date: '2026-09-29',
    city: '倫敦',
    item: '西敏寺 09:30',
    type: '門票',
    provider: 'Klook',
    fileUrl: 'https://drive.google.com/file/d/second/view',
    notes: '',
  },
];

describe('TicketVaultPage', () => {
  it('renders city quick filters and each ticket date with its weekday', () => {
    const html = renderToStaticMarkup(createElement(TicketVaultPage, {
      tickets,
      canViewTickets: true,
    }));

    expect(html).toContain('城市快速篩選');
    expect(html).toContain('英國');
    expect(html).toContain('倫敦');
    expect(html).toContain('Day 1 · 9/28（一） · 英國');
    expect(html).toContain('Day 2 · 9/29（二） · 倫敦');
    expect(html).toContain('重新登入 Google');
    expect(html).toContain('重新載入預覽');
    expect(html).toContain(
      'https://accounts.google.com/AccountChooser?continue=https%3A%2F%2Fdrive.google.com%2Ffile%2Fd%2Ffirst%2Fview'
    );
    expect(html).not.toContain('在 Drive 開啟');
  });
});
