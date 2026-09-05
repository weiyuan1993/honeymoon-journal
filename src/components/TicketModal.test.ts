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
  it('keeps the embedded Drive preview with compact sign-in and reload actions', () => {
    const html = renderToStaticMarkup(createElement(TicketModal, {
      day: 'Day 1',
      city: '英國',
      tickets,
      canViewTickets: true,
      onClose: () => undefined,
    }));

    expect(html).toContain('https://drive.google.com/file/d/first/preview');
    expect(html).toContain('重新登入 Google');
    expect(html).toContain(
      'https://accounts.google.com/AccountChooser?continue=https%3A%2F%2Fdrive.google.com%2Ffile%2Fd%2Ffirst%2Fview'
    );
    expect(html).toContain('重新載入預覽');
    expect(html).not.toContain('>Drive 開啟<');
    expect(html).not.toContain('預覽無法顯示？');
    expect(html).toContain('aria-label="票券文件導覽"');
    expect(html.indexOf('<nav')).toBeGreaterThan(html.indexOf('<iframe'));
  });
});
