import { useCallback, useEffect, useState } from 'react';
import type { TicketItem, UserPermission } from '@/types';
import {
  formatTicketDate,
  getDrivePreviewUrl,
  TICKET_COUNTRIES,
  ticketMatchesCountry,
  type TicketCountry,
} from './ticketVaultData';
import TicketModal from './TicketModal';
import TicketReauthentication from './TicketReauthentication';
import { GoogleSignInButton } from './AuthButton';

interface TicketVaultPageProps {
  tickets: TicketItem[];
  canViewTickets: boolean;
  onPermissionChange?: (permission: UserPermission) => void;
}

const MOBILE_QUERY = '(max-width: 720px), (max-height: 520px) and (pointer: coarse)';

function useIsMobileTicketVault() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);
    updateIsMobile();
    mediaQuery.addEventListener('change', updateIsMobile);
    return () => mediaQuery.removeEventListener('change', updateIsMobile);
  }, []);

  return isMobile;
}

export default function TicketVaultPage({ tickets, canViewTickets, onPermissionChange }: TicketVaultPageProps) {
  const [selectedId, setSelectedId] = useState<number | null>(tickets[0]?.rowNumber ?? null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<TicketCountry | null>(null);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const isMobile = useIsMobileTicketVault();
  const filteredTickets = selectedCountry
    ? tickets.filter((ticket) => ticketMatchesCountry(ticket, selectedCountry))
    : tickets;
  const selectedTicket = filteredTickets.find((ticket) => ticket.rowNumber === selectedId) || filteredTickets[0];
  const reloadPreview = useCallback(() => {
    setPreviewVersion((version) => version + 1);
  }, []);
  const handlePermissionChange = useCallback((permission: UserPermission) => {
    onPermissionChange?.(permission);
  }, [onPermissionChange]);

  const selectCountry = (country: TicketCountry | null) => {
    setSelectedCountry(country);
    setIsMobilePreviewOpen(false);
    setPreviewVersion(0);
    setSelectedId(
      (country ? tickets.find((ticket) => ticketMatchesCountry(ticket, country)) : tickets[0])?.rowNumber ?? null
    );
  };

  const selectTicket = (rowNumber: number) => {
    setSelectedId(rowNumber);
    setPreviewVersion(0);
    if (isMobile) setIsMobilePreviewOpen(true);
  };

  useEffect(() => {
    if (!isMobile) setIsMobilePreviewOpen(false);
  }, [isMobile]);

  if (!canViewTickets) {
    return (
      <div className="ticket-vault animate-fade-in-up">
        <div className="ticket-vault-heading">
          <div>
            <p className="eyebrow">TRAVEL DOCUMENTS</p>
            <h2>票券庫</h2>
            <p>票券資訊只開放給授權帳號。</p>
          </div>
        </div>
        <div className="ticket-private">
          <strong>票券資料受到保護</strong>
          <p>登入 Vic 或 Dora 的授權 Google 帳號後，才能載入票券清單與 Drive 文件。</p>
          <GoogleSignInButton
            onChange={handlePermissionChange}
            className="ticket-private-sign-in"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-vault animate-fade-in-up">
      <div className="ticket-vault-heading">
        <div><p className="eyebrow">TRAVEL DOCUMENTS</p><h2>票券庫</h2></div>
        <div className="ticket-vault-count"><strong>{tickets.length}</strong><span>documents</span></div>
      </div>
      <div className="ticket-country-filters" aria-label="國家快速篩選">
        <button
          type="button"
          className={`ticket-country-chip ${selectedCountry === null ? 'selected' : ''}`}
          aria-pressed={selectedCountry === null}
          onClick={() => selectCountry(null)}
        >
          全部
        </button>
        {TICKET_COUNTRIES.map((country) => (
          <button
            key={country.label}
            type="button"
            className={`ticket-country-chip ${selectedCountry === country ? 'selected' : ''}`}
            aria-pressed={selectedCountry === country}
            onClick={() => selectCountry(country)}
          >
            {country.label}
          </button>
        ))}
      </div>
      <div className="ticket-vault-layout">
        <div className="ticket-vault-list-wrapper">
          <div className="ticket-vault-list">
            {filteredTickets.map((ticket) => (
              <button key={ticket.rowNumber} type="button" onClick={() => selectTicket(ticket.rowNumber)} className={`vault-ticket ${selectedTicket?.rowNumber === ticket.rowNumber ? 'selected' : ''}`}>
                <span>{ticket.type || '票券'}</span><strong>{ticket.item}</strong><small>{ticket.day} · {formatTicketDate(ticket.date)} · {ticket.city}</small>
              </button>
            ))}
            {filteredTickets.length === 0 && <p className="empty-copy">找不到符合的票券。</p>}
          </div>
        </div>
        {!isMobile && <aside className="ticket-detail-panel">
          {selectedTicket ? <>
            <p className="eyebrow">{selectedTicket.day} · {formatTicketDate(selectedTicket.date)} · {selectedTicket.city}</p>
            <h3>{selectedTicket.item}</h3>
            <p className="ticket-provider">{selectedTicket.type} · {selectedTicket.provider}</p>
            {selectedTicket.notes && <p className="ticket-notes">{selectedTicket.notes}</p>}
            <div className="ticket-detail-actions">
              <TicketReauthentication
                onReauthenticated={reloadPreview}
                onPermissionChange={onPermissionChange}
                buttonClassName="ticket-open-link"
                googleButtonClassName="ticket-google-sign-in"
              />
              <a href={selectedTicket.fileUrl} target="_blank" rel="noopener noreferrer" className="ticket-open-link">在 Drive 開啟</a>
            </div>
            <iframe key={`${selectedTicket.rowNumber}-${previewVersion}`} title={`${selectedTicket.item} 預覽`} src={getDrivePreviewUrl(selectedTicket.fileUrl)} className="ticket-frame" allow="autoplay" />
          </> : <p className="empty-copy">選擇左側票券查看資訊。</p>}
        </aside>}
      </div>
      {isMobile && selectedTicket && isMobilePreviewOpen && (
        <TicketModal
          day={`${selectedTicket.day} · ${formatTicketDate(selectedTicket.date)}`}
          city={selectedTicket.city}
          tickets={filteredTickets}
          canViewTickets={canViewTickets}
          initialSelectedId={selectedTicket.rowNumber}
          onSelectedTicketChange={setSelectedId}
          onPermissionChange={onPermissionChange}
          onClose={() => setIsMobilePreviewOpen(false)}
        />
      )}
    </div>
  );
}
