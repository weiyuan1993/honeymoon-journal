import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ItineraryItem, TicketItem } from '@/types';
import ItineraryCard from './ItineraryCard';

const item: ItineraryItem = {
  rowNumber: 2,
  day: 'Day 7',
  date: '2026-10-04',
  weekday: '日',
  city: '巴黎',
  content: '羅浮宮',
  transport: '',
  ticket: '',
  link: 'https://example.com/louvre\nhttps://example.com/cruise',
  referenceLinks: [
    { label: '羅浮宮', url: 'https://example.com/louvre' },
    { label: '塞納河遊船', url: 'https://example.com/cruise' },
  ],
  hotel: '',
};

const ticket: TicketItem = {
  rowNumber: 7,
  day: 'Day 7',
  date: '2026-10-04',
  city: '巴黎',
  item: '羅浮宮門票',
  type: '門票',
  provider: 'Louvre',
  fileUrl: 'https://drive.google.com/file/d/example/view',
  notes: '',
};

describe('ItineraryCard ticket and reference controls', () => {
  it('renders multi-line itinerary content as a list without losing rich-text links', () => {
    const html = renderToStaticMarkup(createElement(ItineraryCard, {
      item: {
        ...item,
        content: '09:00 西敏寺<br><a href="https://example.com/big-ben">11:20 大笨鐘</a>',
      },
      id: 'day-Day 7',
      onUpdate: () => undefined,
      navigationData: {},
      attractionDetails: {},
      foodRecommendations: {},
      dayTickets: [],
      onFoodUpdate: () => undefined,
      canEdit: false,
    }));

    expect(html).toContain('<ul');
    expect(html).toContain('<li');
    expect(html).toContain('09:00 西敏寺');
    expect(html).toContain('href="https://example.com/big-ben"');
  });

  it('renders separate ticket and reference-link buttons for the same day', () => {
    const html = renderToStaticMarkup(createElement(ItineraryCard, {
      item,
      id: 'day-Day 7',
      onUpdate: () => undefined,
      navigationData: {},
      attractionDetails: {},
      foodRecommendations: {},
      dayTickets: [ticket],
      onFoodUpdate: () => undefined,
      canEdit: true,
    }));

    expect(html).toContain('查看當日票券（1 張）');
    expect(html).toContain('查看參考連結（2 筆）');
  });

  it('does not render itinerary reference links without editor access', () => {
    const html = renderToStaticMarkup(createElement(ItineraryCard, {
      item,
      id: 'day-Day 7',
      onUpdate: () => undefined,
      navigationData: {},
      attractionDetails: {},
      foodRecommendations: {},
      dayTickets: [],
      onFoodUpdate: () => undefined,
      canEdit: false,
    }));

    expect(html).not.toContain('查看參考連結（2 筆）');
  });
});
