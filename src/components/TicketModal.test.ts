import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TicketItem } from '@/types';
import TicketModal from './TicketModal';

const tickets: TicketItem[] = [{
  rowNumber: 2,
  day: 'Day 1',
  date: '2026-09-28',
  city: '英國',
  item: '機票 - Vic',
  type: '交通',
  provider: 'Emirates',
  fileUrl: 'https://drive.google.com/file/d/first/view',
  notes: '',
}];

describe('TicketModal', () => {
  it('offers web-app reauthentication and a direct Drive fallback', () => {
    const html = renderToStaticMarkup(createElement(TicketModal, {
      day: 'Day 1',
      city: '英國',
      tickets,
      canViewTickets: true,
      onClose: () => undefined,
    }));

    expect(html).toContain('https://drive.google.com/file/d/first/preview');
    expect(html).toContain('重新登入');
    expect(html).toContain('在 Drive 開啟');
    expect(html).toContain('href="https://drive.google.com/file/d/first/view"');
    expect(html).not.toContain('AccountChooser');
    expect(html).not.toContain('重新載入預覽');
    expect(html).not.toContain('<h2');
    expect(html).toContain('aria-label="票券文件導覽"');
    expect(html.indexOf('<nav')).toBeGreaterThan(html.indexOf('<iframe'));
  });
});
