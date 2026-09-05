import { useEffect, useState } from 'react';
import type { TicketItem } from '@/types';
import {
  formatTicketDate,
  getDrivePreviewUrl,
  getGoogleAccountChooserUrl,
  getTicketCities,
} from './ticketVaultData';
import TicketModal from './TicketModal';

interface TicketVaultPageProps {
  tickets: TicketItem[];
  canViewTickets: boolean;
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

export default function TicketVaultPage({ tickets, canViewTickets }: TicketVaultPageProps) {
  const [selectedId, setSelectedId] = useState<number | null>(tickets[0]?.rowNumber ?? null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const isMobile = useIsMobileTicketVault();
  const cities = getTicketCities(tickets);
  const filteredTickets = selectedCity
    ? tickets.filter((ticket) => ticket.city.trim() === selectedCity)
    : tickets;
  const selectedTicket = filteredTickets.find((ticket) => ticket.rowNumber === selectedId) || filteredTickets[0];

  const selectCity = (city: string | null) => {
    setSelectedCity(city);
    setIsMobilePreviewOpen(false);
    setPreviewVersion(0);
    setSelectedId(
      (city ? tickets.find((ticket) => ticket.city.trim() === city) : tickets[0])?.rowNumber ?? null
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
            <p>票券資訊只開放給授權帳號，請從右上角選單登入。</p>
          </div>
        </div>
        <div className="ticket-private">
          <strong>票券資料受到保護</strong>
          <p>登入 Vic 或 Dora 的授權 Google 帳號後，才能載入票券清單與 Drive 文件。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-vault animate-fade-in-up">
      <div className="ticket-vault-heading">
        <div><p className="eyebrow">TRAVEL DOCUMENTS</p><h2>票券庫</h2><p>所有確認文件集中收納，出發當天不用再翻找訊息。</p></div>
        <div className="ticket-vault-count"><strong>{tickets.length}</strong><span>documents</span></div>
      </div>
      <div className="ticket-city-filters" aria-label="城市快速篩選">
        <span className="ticket-city-filter-label">城市</span>
        <div className="ticket-city-chip-list">
          <button
            type="button"
            className={`ticket-city-chip ${selectedCity === null ? 'selected' : ''}`}
            aria-pressed={selectedCity === null}
            onClick={() => selectCity(null)}
          >
            全部 <small>{tickets.length}</small>
          </button>
          {cities.map((city) => {
            const count = tickets.filter((ticket) => ticket.city.trim() === city).length;
            return (
              <button
                key={city}
                type="button"
                className={`ticket-city-chip ${selectedCity === city ? 'selected' : ''}`}
                aria-pressed={selectedCity === city}
                onClick={() => selectCity(city)}
              >
                {city} <small>{count}</small>
              </button>
            );
          })}
        </div>
      </div>
      <div className="ticket-vault-layout">
        <div className="ticket-vault-list-wrapper">
          {isMobile && <p className="ticket-mobile-hint">點選票券，即可全螢幕查看內嵌預覽。</p>}
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
              <a href={getGoogleAccountChooserUrl(selectedTicket.fileUrl)} target="_blank" rel="noopener noreferrer" className="ticket-open-link ticket-sign-in-link">重新登入 Google</a>
              <button type="button" onClick={() => setPreviewVersion((version) => version + 1)} className="ticket-open-link">重新載入預覽</button>
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
          title="票券預覽"
          onClose={() => setIsMobilePreviewOpen(false)}
        />
      )}
    </div>
  );
}
