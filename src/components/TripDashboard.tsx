import { useMemo } from 'react';
import type { ItineraryItem, TicketItem } from '@/types';

interface TripDashboardProps {
  itinerary: ItineraryItem[];
  tickets: TicketItem[];
  onOpenItinerary: () => void;
  onOpenTickets: () => void;
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-TW', { month: 'short', day: 'numeric', weekday: 'short' }).format(date);
};

export default function TripDashboard({
  itinerary,
  tickets,
  onOpenItinerary,
  onOpenTickets,
}: TripDashboardProps) {
  const cities = useMemo(() => {
    const values = itinerary.map((item) => item.city.replace(/→.*/, '').trim()).filter(Boolean);
    return Array.from(new Set(values));
  }, [itinerary]);

  const departures = itinerary.filter((item) => item.city.includes('→'));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = itinerary.find((item) => new Date(item.date) >= today) || itinerary[0];
  const nextTransfer = departures.find((item) => new Date(item.date) >= today) || departures[0];
  const daysToGo = itinerary[0]
    ? Math.ceil((new Date(itinerary[0].date).getTime() - today.getTime()) / 86400000)
    : null;

  return (
    <div className="dashboard-shell animate-fade-in-up">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">EUROPE HONEYMOON · 2026</p>
          <h2>把每一段旅程，<br /><em>留給當下。</em></h2>
          <p className="dashboard-intro">行程、票券與花費都集中在這裡；出發前只需要看一眼，就知道下一步。</p>
          <div className="dashboard-actions">
            <button type="button" onClick={onOpenItinerary}>查看完整行程</button>
            <button type="button" className="secondary" onClick={onOpenTickets}>開啟票券庫</button>
          </div>
        </div>
        <div className="countdown-card" aria-label="出發倒數">
          <span>DEPARTURE</span>
          <strong>{daysToGo !== null && daysToGo >= 0 ? daysToGo : '—'}</strong>
          <small>days to London</small>
          <div>{itinerary[0] ? formatDate(itinerary[0].date) : '等待行程資料'}</div>
        </div>
      </section>

      <section className="dashboard-stats" aria-label="旅程摘要">
        <article><span>旅程天數</span><strong>{itinerary.length}</strong><small>個行程日</small></article>
        <article><span>造訪城市</span><strong>{cities.length}</strong><small>{cities.slice(0, 3).join(' · ')}{cities.length > 3 ? ' …' : ''}</small></article>
        <article><span>已收納票券</span><strong>{tickets.length}</strong><small>交通、門票與文件</small></article>
        <article><span>跨城移動</span><strong>{departures.length}</strong><small>段已規劃路線</small></article>
      </section>

      <section className="dashboard-grid">
        <article className="next-stop-card">
          <div className="section-heading"><span>UP NEXT</span><button type="button" onClick={onOpenItinerary}>所有行程 →</button></div>
          {upcoming ? (
            <>
              <p className="next-date">{upcoming.day} · {formatDate(upcoming.date)}</p>
              <h3>{upcoming.city}</h3>
              <p>{stripHtml(upcoming.content)}</p>
              {upcoming.hotel && <div className="stay-line">⌂ {stripHtml(upcoming.hotel)}</div>}
            </>
          ) : <p className="empty-copy">尚未載入行程。</p>}
        </article>

        <article className="transfer-card">
          <div className="section-heading"><span>NEXT TRANSFER</span><button type="button" onClick={onOpenItinerary}>路線細節 →</button></div>
          {nextTransfer ? (
            <>
              <p className="next-date">{nextTransfer.day} · {formatDate(nextTransfer.date)}</p>
              <h3>{nextTransfer.city}</h3>
              <p>{stripHtml(nextTransfer.transport) || '交通資訊將於行程中顯示。'}</p>
              <div className="ticket-tag">票務 · {stripHtml(nextTransfer.ticket) || '請查看行程備註'}</div>
            </>
          ) : <p className="empty-copy">尚未有跨城行程。</p>}
        </article>
      </section>

      <section className="ticket-preview">
        <div className="section-heading"><span>TICKET VAULT</span><button type="button" onClick={onOpenTickets}>查看全部 {tickets.length} 張 →</button></div>
        <div className="ticket-preview-list">
          {tickets.slice(0, 4).map((ticket) => (
            <button type="button" key={ticket.rowNumber} onClick={onOpenTickets} className="ticket-preview-item">
              <span>{ticket.type || '票券'}</span>
              <strong>{ticket.item}</strong>
              <small>{ticket.day} · {ticket.city}</small>
            </button>
          ))}
          {tickets.length === 0 && <p className="empty-copy">尚未收納票券。</p>}
        </div>
      </section>
    </div>
  );
}
