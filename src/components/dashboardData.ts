import type { ItineraryItem, TicketItem } from '@/types';
import { tripConfig } from '../config/trip.config';
import { getPrimaryTripCity } from '../utils/tripLocations';

const DAY_IN_MS = 86_400_000;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const MONTH_DAY_PATTERN = /^(\d{1,2})\/(\d{1,2})$/;

type TripPhase = 'before' | 'during' | 'after';

interface TripTimeline {
  phase: TripPhase;
  totalDays: number;
  daysToStart: number | null;
  currentDayNumber: number | null;
  focusIsToday: boolean;
  focusItem?: ItineraryItem;
  nextTransfer?: ItineraryItem;
  lastDatedItem?: ItineraryItem;
}

type FocusDayAction =
  | { type: 'tickets'; tickets: TicketItem[] }
  | { type: 'reference-links'; count: number }
  | null;

const COUNTRY_BY_CITY: Record<string, string> = {
  倫敦: '英國',
  巴黎: '法國',
  琉森: '瑞士',
  因特拉肯: '瑞士',
  茵特拉肯: '瑞士',
  格林德瓦: '瑞士',
  策馬特: '瑞士',
  蘇黎世: '瑞士',
  米蘭: '義大利',
  威尼斯: '義大利',
  佛羅倫斯: '義大利',
  比薩: '義大利',
  羅馬: '義大利',
};

export const getTripCountry = (value: string): string | null =>
  COUNTRY_BY_CITY[getPrimaryTripCity(value)] ?? null;

export const getFocusDayAction = (
  focusItem: ItineraryItem | undefined,
  tickets: TicketItem[]
): FocusDayAction => {
  if (!focusItem) return null;

  const focusTickets = tickets.filter(
    (ticket) => ticket.day === focusItem.day
  );
  if (focusTickets.length > 0) {
    return { type: 'tickets', tickets: focusTickets };
  }

  const referenceLinkCount = focusItem.referenceLinks?.length ?? 0;
  return referenceLinkCount > 0
    ? { type: 'reference-links', count: referenceLinkCount }
    : null;
};

const toCalendarDay = (
  value: string,
  fallbackYear = tripConfig.tripYear
): number | null => {
  const trimmedValue = value.trim();
  const dateOnlyMatch = DATE_ONLY_PATTERN.exec(trimmedValue);
  const monthDayMatch = MONTH_DAY_PATTERN.exec(trimmedValue);
  if (!dateOnlyMatch && !monthDayMatch) return null;
  const [, year, month, day] = dateOnlyMatch ?? [
    '',
    String(fallbackYear),
    monthDayMatch![1],
    monthDayMatch![2],
  ];
  const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return timestamp;
};

const todayCalendarDay = (today: Date): number =>
  Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

export const buildTripTimeline = (
  itinerary: ItineraryItem[],
  today = new Date()
): TripTimeline => {
  const datedItems = itinerary
    .map((item) => ({
      item,
      day: toCalendarDay(item.date),
    }))
    .filter(
      (entry): entry is { item: ItineraryItem; day: number } =>
        entry.day !== null
    )
    .sort((left, right) => left.day - right.day);

  if (datedItems.length === 0) {
    return {
      phase: 'before',
      totalDays: itinerary.length,
      daysToStart: null,
      currentDayNumber: null,
      focusIsToday: false,
      focusItem: itinerary[0],
      nextTransfer: itinerary.find((item) => item.city.includes('→')),
    };
  }

  const todayDay = todayCalendarDay(today);
  const firstDay = datedItems[0].day;
  const lastDay = datedItems[datedItems.length - 1].day;
  const totalDays = Math.floor((lastDay - firstDay) / DAY_IN_MS) + 1;
  const phase: TripPhase =
    todayDay < firstDay ? 'before' : todayDay > lastDay ? 'after' : 'during';

  if (phase === 'after') {
    return {
      phase,
      totalDays,
      daysToStart: null,
      currentDayNumber: itinerary.length,
      focusIsToday: false,
      lastDatedItem: datedItems[datedItems.length - 1].item,
    };
  }

  const focusEntry =
    phase === 'before'
      ? datedItems[0]
      : datedItems.find((entry) => entry.day >= todayDay) ??
        datedItems[datedItems.length - 1];
  const transferEntry = datedItems.find(
    (entry) =>
      entry.item.city.includes('→') &&
      entry.day >= (phase === 'before' ? firstDay : todayDay)
  );

  return {
    phase,
    totalDays,
    daysToStart:
      phase === 'before'
        ? Math.round((firstDay - todayDay) / DAY_IN_MS)
        : 0,
    currentDayNumber:
      phase === 'during'
        ? Math.floor((todayDay - firstDay) / DAY_IN_MS) + 1
        : null,
    focusIsToday: focusEntry.day === todayDay,
    focusItem: focusEntry.item,
    nextTransfer: transferEntry?.item,
    lastDatedItem: datedItems[datedItems.length - 1].item,
  };
};
