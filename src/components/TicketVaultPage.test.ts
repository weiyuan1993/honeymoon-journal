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
  it('renders a direct Google sign-in entry for unauthenticated users', () => {
    const html = renderToStaticMarkup(createElement(TicketVaultPage, {
      tickets,
      canViewTickets: false,
    }));

    expect(html).toContain('票券資料受到保護');
    expect(html).toContain('ticket-private-sign-in');
  });

  it('renders compact country filters and direct Drive fallback actions', () => {
    const html = renderToStaticMarkup(createElement(TicketVaultPage, {
      tickets,
      canViewTickets: true,
    }));

    expect(html).toContain('國家快速篩選');
    expect(html).toContain('英國');
    expect(html).toContain('法國');
    expect(html).toContain('瑞士');
    expect(html).toContain('義大利');
    expect(html).toContain('Day 1 · 9/28（一） · 英國');
    expect(html).toContain('Day 2 · 9/29（二） · 倫敦');
    expect(html).toContain('重新登入');
    expect(html).toContain('在 Drive 開啟');
    expect(html).toContain('href="https://drive.google.com/file/d/first/view"');
    expect(html).not.toContain('AccountChooser');
    expect(html).not.toContain('所有確認文件集中收納');
  });
});
