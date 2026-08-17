import { describe, expect, it } from 'vitest';
import type { ItineraryItem, TicketItem } from '@/types';
import {
  buildTripTimeline,
  getFocusDayAction,
} from './dashboardData';

const itineraryItem = (
  day: string,
  date: string,
  city: string
): ItineraryItem => ({
  rowNumber: Number(day.replace(/\D/g, '')),
  day,
  date,
  weekday: '',
  city,
  content: `${city}行程`,
  transport: '',
  ticket: '',
  link: '',
  referenceLinks: [],
  hotel: '',
});

const itinerary = [
  itineraryItem('Day 1', '2026-09-28', '倫敦'),
  itineraryItem('Day 2', '2026-09-29', '倫敦'),
  itineraryItem('Day 3', '2026-09-30', '倫敦 → 巴黎'),
];

const ticketItem = (day: string, rowNumber: number): TicketItem => ({
  rowNumber,
  day,
  date: '2026-09-28',
  city: '倫敦',
  type: '交通',
  item: `Ticket ${rowNumber}`,
  provider: 'Provider',
  fileUrl: `https://example.com/${rowNumber}`,
  notes: '',
});

describe('dashboard trip timeline', () => {
  it('counts calendar days without a Taiwan timezone off-by-one', () => {
    const timeline = buildTripTimeline(
      itinerary,
      new Date(2026, 6, 28)
    );

    expect(timeline.phase).toBe('before');
    expect(timeline.daysToStart).toBe(62);
    expect(timeline.focusItem?.day).toBe('Day 1');
    expect(timeline.nextTransfer?.day).toBe('Day 3');
  });

  it('supports the M/D dates used by local itinerary mocks', () => {
    const timeline = buildTripTimeline(
      [
        itineraryItem('Day 1', '9/28', '倫敦'),
        itineraryItem('Day 2', '9/29', '倫敦 → 巴黎'),
      ],
      new Date(2026, 6, 28)
    );

    expect(timeline.daysToStart).toBe(62);
    expect(timeline.focusItem?.day).toBe('Day 1');
    expect(timeline.nextTransfer?.day).toBe('Day 2');
  });

  it('switches to the current travel day during the trip', () => {
    const timeline = buildTripTimeline(
      itinerary,
      new Date(2026, 8, 29, 18)
    );

    expect(timeline.phase).toBe('during');
    expect(timeline.totalDays).toBe(3);
    expect(timeline.currentDayNumber).toBe(2);
    expect(timeline.focusItem?.day).toBe('Day 2');
  });

  it('does not fall back to Day 1 after the trip', () => {
    const timeline = buildTripTimeline(
      itinerary,
      new Date(2026, 9, 1)
    );

    expect(timeline.phase).toBe('after');
    expect(timeline.focusItem).toBeUndefined();
    expect(timeline.nextTransfer).toBeUndefined();
    expect(timeline.lastDatedItem?.day).toBe('Day 3');
  });

  it('uses the chronologically last row when Sheet rows are reordered', () => {
    const timeline = buildTripTimeline(
      [itinerary[2], itinerary[0], itinerary[1]],
      new Date(2026, 9, 1)
    );

    expect(timeline.lastDatedItem?.day).toBe('Day 3');
  });

  it('marks a future focus row as up next when today is a date gap', () => {
    const timeline = buildTripTimeline(
      [
        itineraryItem('Day 1', '2026-09-28', '倫敦'),
        itineraryItem('Day 3', '2026-09-30', '巴黎'),
      ],
      new Date(2026, 8, 29)
    );

    expect(timeline.phase).toBe('during');
    expect(timeline.currentDayNumber).toBe(2);
    expect(timeline.focusItem?.day).toBe('Day 3');
    expect(timeline.focusIsToday).toBe(false);
  });
});

describe('dashboard focus-day action', () => {
  it('returns only tickets matching the focused itinerary day', () => {
    const action = getFocusDayAction(itinerary[1], [
      ticketItem('Day 1', 1),
      ticketItem('Day 2', 2),
      ticketItem('Day 2', 3),
    ]);

    expect(action).toEqual({
      type: 'tickets',
      tickets: [ticketItem('Day 2', 2), ticketItem('Day 2', 3)],
    });
  });

  it('opens the itinerary reference-link list when no ticket is loaded', () => {
    const focusItem = {
      ...itinerary[0],
      link: 'https://example.com/booking',
      referenceLinks: [
        { label: '博物館', url: 'https://example.com/museum' },
        { label: '遊船', url: 'https://example.com/cruise' },
      ],
    };

    expect(getFocusDayAction(focusItem, [])).toEqual({
      type: 'reference-links',
      count: 2,
    });
  });

  it('does not show a focus action without tickets or reference links', () => {
    expect(getFocusDayAction(itinerary[0], [])).toBeNull();
    expect(getFocusDayAction(undefined, [ticketItem('Day 1', 1)]))
      .toBeNull();
  });
});
