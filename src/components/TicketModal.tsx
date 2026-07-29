import { useMemo, useState } from 'react';
import type { TicketItem } from '@/types';

interface TicketModalProps {
  day: string;
  city: string;
  tickets: TicketItem[];
  canViewTickets: boolean;
  onClose: () => void;
}

const getDrivePreviewUrl = (url: string) => {
  const match = url.match(/\/d\/([^/]+)/);
  if (!match) return url;
  return `https://drive.google.com/file/d/${match[1]}/preview`;
};

export default function TicketModal({
  day,
  city,
  tickets,
  canViewTickets,
  onClose,
}: TicketModalProps) {
  const [selectedId, setSelectedId] = useState(tickets[0]?.rowNumber);
  const selectedTicket = useMemo(
    () =>
      tickets.find((ticket) => ticket.rowNumber === selectedId) || tickets[0],
    [selectedId, tickets]
  );

  if (!selectedTicket) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        aria-label="關閉票券預覽"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="border-b border-gold/20 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-[13px] uppercase tracking-[0.16em] text-gold">
                {day} · {city}
              </p>
              <h2 className="mt-1 font-display text-base text-ink">
                當日票券
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-ink/45 transition-colors hover:bg-gray-100 hover:text-ink"
              aria-label="關閉"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]">
          <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-3">
            {tickets.map((ticket) => (
              <button
                key={ticket.rowNumber}
                type="button"
                onClick={() => setSelectedId(ticket.rowNumber)}
                className={`max-w-[220px] shrink-0 rounded-lg border px-3 py-2 text-left transition-colors ${
                  ticket.rowNumber === selectedTicket.rowNumber
                    ? 'border-gold bg-gold/10 text-ink'
                    : 'border-gray-200 text-ink/60 hover:border-gold/50 hover:bg-gold/5'
                }`}
              >
                <span className="block truncate font-serif text-xs">
                  {ticket.item}
                </span>
                <span className="mt-1 block truncate font-serif text-[13px] text-ink/45">
                  {ticket.provider}
                  {ticket.notes ? ` · ${ticket.notes}` : ''}
                </span>
              </button>
            ))}
          </div>

          <div className="min-h-0 overflow-y-auto p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-serif text-sm font-semibold text-ink">
                  {selectedTicket.item}
                </h3>
                <p className="mt-1 font-serif text-xs text-ink/55">
                  {selectedTicket.type} · {selectedTicket.provider}
                  {selectedTicket.notes ? ` · ${selectedTicket.notes}` : ''}
                </p>
              </div>
              {canViewTickets && (
                <a
                  href={selectedTicket.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg bg-ink px-3 py-2 font-serif text-xs text-white transition-colors hover:bg-ink/85"
                >
                  Drive 開啟
                </a>
              )}
            </div>

            {canViewTickets ? (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                <iframe
                  title={`${selectedTicket.item} preview`}
                  src={getDrivePreviewUrl(selectedTicket.fileUrl)}
                  className="h-[62vh] w-full bg-white"
                  allow="autoplay"
                />
              </div>
            ) : (
              <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-lg border border-dashed border-gold/30 bg-gold/5 px-6 py-10 text-center">
                <svg
                  className="h-9 w-9 text-gold"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 17v-5" />
                  <path d="M12 8h.01" />
                  <path d="M19 11.5V9a7 7 0 0 0-14 0v2.5" />
                  <path d="M5.75 11.5h12.5A1.75 1.75 0 0 1 20 13.25v5A1.75 1.75 0 0 1 18.25 20H5.75A1.75 1.75 0 0 1 4 18.25v-5a1.75 1.75 0 0 1 1.75-1.75Z" />
                </svg>
                <p className="mt-3 font-display text-sm text-ink">
                  票券內容僅限編輯者查看
                </p>
                <p className="mt-2 max-w-xs font-serif text-xs leading-relaxed text-ink/55">
                  訪客可以確認當天有哪些票券，但不會載入 PDF 或顯示 Drive 檔案連結。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
