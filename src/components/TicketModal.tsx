import { useCallback, useMemo, useState } from 'react';
import type { TicketItem, UserPermission } from '@/types';
import { getDrivePreviewUrl } from './ticketVaultData';
import TicketReauthentication from './TicketReauthentication';

interface TicketModalProps {
  day: string;
  city: string;
  tickets: TicketItem[];
  canViewTickets: boolean;
  initialSelectedId?: number;
  onSelectedTicketChange?: (rowNumber: number) => void;
  onPermissionChange?: (permission: UserPermission) => void;
  onClose: () => void;
}

export default function TicketModal({
  day,
  city,
  tickets,
  canViewTickets,
  initialSelectedId,
  onSelectedTicketChange,
  onPermissionChange,
  onClose,
}: TicketModalProps) {
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? tickets[0]?.rowNumber);
  const [previewVersion, setPreviewVersion] = useState(0);
  const selectedTicket = useMemo(
    () =>
      tickets.find((ticket) => ticket.rowNumber === selectedId) || tickets[0],
    [selectedId, tickets]
  );

  const selectTicket = (rowNumber: number) => {
    setSelectedId(rowNumber);
    setPreviewVersion(0);
    onSelectedTicketChange?.(rowNumber);
  };
  const reloadPreview = useCallback(() => {
    setPreviewVersion((version) => version + 1);
  }, []);

  if (!selectedTicket) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        aria-label="關閉票券預覽"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-preview-title"
        className="relative z-10 flex h-[96dvh] max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-[90vh] sm:max-h-[90vh] sm:rounded-2xl"
      >
        <div className="border-b border-gold/20 px-3 py-2 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p id="ticket-preview-title" title={`${day} · ${city}`} className="truncate font-display text-[11px] uppercase tracking-[0.16em] text-gold sm:text-[13px]">
                {day} · {city}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {canViewTickets && (
                <>
                  <TicketReauthentication
                    onReauthenticated={reloadPreview}
                    onPermissionChange={onPermissionChange}
                    buttonClassName="rounded-md border border-ink/15 bg-white px-2 py-1 font-serif text-[11px] text-ink transition-colors hover:border-gold hover:bg-gold/5"
                    googleButtonClassName="ticket-google-sign-in flex h-7 shrink-0 items-center"
                  />
                  <a
                    href={selectedTicket.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`在 Drive 開啟 ${selectedTicket.item}`}
                    title="在 Drive 開啟"
                    className="rounded-md border border-ink/15 bg-white px-2 py-1 font-serif text-[11px] text-ink transition-colors hover:border-gold hover:bg-gold/5"
                  >
                    Drive
                  </a>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-ink/45 transition-colors hover:bg-gray-100 hover:text-ink"
                aria-label="關閉"
              >
                <svg
                  className="h-4 w-4"
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
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {canViewTickets ? (
            <div className="min-h-0 flex-1 p-2 sm:p-3">
              <div className="h-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                <iframe
                  key={`${selectedTicket.rowNumber}-${previewVersion}`}
                  title={`${selectedTicket.item} preview`}
                  src={getDrivePreviewUrl(selectedTicket.fileUrl)}
                  className="h-full w-full bg-white"
                  allow="autoplay"
                />
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 text-center">
              <div className="w-full rounded-lg border border-dashed border-gold/30 bg-gold/5 px-6 py-10">
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
            </div>
          )}

          <nav aria-label="票券文件導覽" className="flex shrink-0 gap-1.5 overflow-x-auto border-t border-gray-100 px-2 py-2 sm:px-3">
            {tickets.map((ticket) => (
              <button
                key={ticket.rowNumber}
                type="button"
                onClick={() => selectTicket(ticket.rowNumber)}
                title={`${ticket.type} · ${ticket.provider}${ticket.notes ? ` · ${ticket.notes}` : ''}`}
                className={`max-w-[156px] shrink-0 truncate rounded-full border px-3 py-1.5 text-left font-serif text-xs transition-colors ${
                  ticket.rowNumber === selectedTicket.rowNumber
                    ? 'border-gold bg-gold/10 text-ink'
                    : 'border-gray-200 text-ink/60 hover:border-gold/50 hover:bg-gold/5'
                }`}
              >
                {ticket.item}
              </button>
            ))}
          </nav>
        </div>
      </section>
    </div>
  );
}
