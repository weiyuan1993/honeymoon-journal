import type { TicketItem } from '@/types';
import { tripConfig } from '../config/trip.config';

const ISO_DATE_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const MONTH_DAY_PATTERN = /^(\d{1,2})\/(\d{1,2})$/;
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function getDrivePreviewUrl(url: string): string {
  const match = url.match(/\/d\/([^/]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : url;
}

export const TICKET_COUNTRIES = [
  { label: '英國', placeNames: ['英國', '倫敦'] },
  { label: '法國', placeNames: ['法國', '巴黎'] },
  {
    label: '瑞士',
    placeNames: ['瑞士', '琉森', 'Luzern', '格林德瓦', 'Grindelwald', '因特拉肯', '茵特拉肯', 'Interlaken', '策馬特', 'Zermatt'],
  },
  {
    label: '義大利',
    placeNames: ['義大利', '米蘭', 'Milano', '威尼斯', 'Venezia', '佛羅倫斯', 'Firenze', '羅馬', 'Roma', '梵蒂岡', 'Vatican'],
  },
] as const;

export type TicketCountry = (typeof TICKET_COUNTRIES)[number];

export function ticketMatchesCountry(ticket: TicketItem, country: TicketCountry): boolean {
  return country.placeNames.some((placeName) => ticket.city.includes(placeName));
}

export function formatTicketDate(value: string): string {
  const trimmedValue = value.trim();
  const isoDateMatch = ISO_DATE_PATTERN.exec(trimmedValue);
  const monthDayMatch = MONTH_DAY_PATTERN.exec(trimmedValue);
  if (!isoDateMatch && !monthDayMatch) return trimmedValue;

  const [, year, month, day] = isoDateMatch ?? [
    '',
    String(tripConfig.tripYear),
    monthDayMatch![1],
    monthDayMatch![2],
  ];
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return trimmedValue;
  }

  return `${Number(month)}/${Number(day)}（${WEEKDAYS[date.getUTCDay()]}）`;
}
