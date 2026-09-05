import type { TicketItem } from '@/types';
import { tripConfig } from '../config/trip.config';

const ISO_DATE_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const MONTH_DAY_PATTERN = /^(\d{1,2})\/(\d{1,2})$/;
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function getDrivePreviewUrl(url: string): string {
  const match = url.match(/\/d\/([^/]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : url;
}

export function getGoogleAccountChooserUrl(fileUrl: string): string {
  return `https://accounts.google.com/AccountChooser?continue=${encodeURIComponent(fileUrl)}`;
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

export function getTicketCities(tickets: TicketItem[]): string[] {
  return [...new Set(
    tickets
      .map((ticket) => ticket.city.trim())
      .filter(Boolean)
  )];
}
