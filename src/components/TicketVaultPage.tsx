import { useMemo, useState } from 'react';
import type { TicketItem } from '@/types';

interface TicketVaultPageProps {
  tickets: TicketItem[];
  canViewTickets: boolean;
}

const getDrivePreviewUrl = (url: string) => {
  const match = url.match(/\/d\/([^/]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : url;
};

export default function TicketVaultPage({ tickets, canViewTickets }: TicketVaultPageProps) {
  const [selectedId, setSelectedId] = useState<number | null>(tickets[0]?.rowNumber ?? null);
  const [query, setQuery] = useState('');
  const filteredTickets = useMemo(() => tickets.filter((ticket) =>
    `${ticket.item} ${ticket.city} ${ticket.provider} ${ticket.type}`.toLowerCase().includes(query.toLowerCase())
  ), [tickets, query]);
  const selectedTicket = filteredTickets.find((ticket) => ticket.rowNumber === selectedId) || filteredTickets[0];

  return (
    <div className="ticket-vault animate-fade-in-up">
      <div className="ticket-vault-heading">
        <div><p className="eyebrow">TRAVEL DOCUMENTS</p><h2>票券庫</h2><p>所有確認文件集中收納，出發當天不用再翻找訊息。</p></div>
        <div className="ticket-vault-count"><strong>{tickets.length}</strong><span>documents</span></div>
      </div>
      <input className="ticket-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋城市、交通或景點" aria-label="搜尋票券" />
      <div className="ticket-vault-layout">
        <div className="ticket-vault-list">
          {filteredTickets.map((ticket) => (
            <button key={ticket.rowNumber} type="button" onClick={() => setSelectedId(ticket.rowNumber)} className={`vault-ticket ${selectedTicket?.rowNumber === ticket.rowNumber ? 'selected' : ''}`}>
              <span>{ticket.type || '票券'}</span><strong>{ticket.item}</strong><small>{ticket.day} · {ticket.city}</small>
            </button>
          ))}
          {filteredTickets.length === 0 && <p className="empty-copy">找不到符合的票券。</p>}
        </div>
        <aside className="ticket-detail-panel">
          {selectedTicket ? <>
            <p className="eyebrow">{selectedTicket.day} · {selectedTicket.city}</p>
            <h3>{selectedTicket.item}</h3>
            <p className="ticket-provider">{selectedTicket.type} · {selectedTicket.provider}</p>
            {selectedTicket.notes && <p className="ticket-notes">{selectedTicket.notes}</p>}
            {canViewTickets ? <>
              <a href={selectedTicket.fileUrl} target="_blank" rel="noopener noreferrer" className="ticket-open-link">在 Drive 開啟 ↗</a>
              <iframe title={`${selectedTicket.item} 預覽`} src={getDrivePreviewUrl(selectedTicket.fileUrl)} className="ticket-frame" allow="autoplay" />
            </> : <div className="ticket-private"><strong>文件內容受到保護</strong><p>目前可確認票券資訊；登入授權帳號後即可預覽及開啟檔案。</p></div>}
          </> : <p className="empty-copy">選擇左側票券查看資訊。</p>}
        </aside>
      </div>
    </div>
  );
}
