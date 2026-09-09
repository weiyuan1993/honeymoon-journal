import { useState, useEffect } from 'react';
import type {
  ItineraryItem,
  ItineraryFormData,
  NavigationData,
  AttractionDetails,
  FoodRecommendations,
  ItineraryReferenceLink,
  TicketItem,
  UserPermission,
} from '@/types';
import { tripClient } from '@/utils/tripClient';
import DetailModal from './DetailModal';
import MapModal from './MapModal';
import FoodModal from './FoodModal';
import ReferenceLinksModal from './ReferenceLinksModal';
import TicketModal from './TicketModal';

const itineraryActionButtonClassName =
  'inline-flex flex-1 min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm text-deep-blue transition-colors hover:bg-deep-blue/5 active:bg-deep-blue/10';
const itineraryActionIconClassName = 'h-4 w-4';

interface ItineraryCardProps {
  item: ItineraryItem;
  id: string;
  onUpdate: (updatedItem?: ItineraryFormData) => void;
  navigationData: NavigationData;
  attractionDetails: AttractionDetails;
  foodRecommendations: FoodRecommendations;
  dayTickets: TicketItem[];
  onFoodUpdate: () => void;
  canEdit: boolean;
  onPermissionChange?: (permission: UserPermission) => void;
}

const splitItineraryHtmlLines = (content: string) =>
  content
    .split(/<br\s*\/?\s*>/i)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

export default function ItineraryCard({
  item,
  id,
  onUpdate,
  navigationData,
  attractionDetails,
  foodRecommendations,
  dayTickets,
  onFoodUpdate,
  canEdit,
  onPermissionChange,
}: ItineraryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ItineraryFormData>({
    rowNumber: item.rowNumber,
    expectedDay: item.day,
    city: item.city,
    content: item.content,
    transport: item.transport,
    ticket: item.ticket,
    link: item.link,
  });
  const [saving, setSaving] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showFood, setShowFood] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [showReferenceLinks, setShowReferenceLinks] = useState(false);

  // Check if there's detail data for this day
  const detailData = attractionDetails && attractionDetails[item.day];

  // Check if there are Google Maps destinations for this day
  const dayNavigation = navigationData && navigationData[item.day];
  const hasNavigation = !!dayNavigation;

  // Check if there's food data for this day
  const foodData = foodRecommendations && foodRecommendations[item.day];
  const hasTickets = dayTickets.length > 0;
  const referenceLinks: ItineraryReferenceLink[] = item.referenceLinks ?? [];
  const hasReferenceLinks = canEdit && referenceLinks.length > 0;
  const itineraryLines = splitItineraryHtmlLines(item.content);

  useEffect(() => {
    setFormData({
      rowNumber: item.rowNumber,
      expectedDay: item.day,
      city: item.city,
      content: item.content,
      transport: item.transport,
      ticket: item.ticket,
      link: item.link,
    });
  }, [item]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await tripClient.editItinerary(formData);
      if (res.success) {
        setIsEditing(false);
        onUpdate(formData);
      } else {
        alert(res.message);
      }
    } catch (error) {
      alert('更新失敗');
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setFormData({
      rowNumber: item.rowNumber,
      expectedDay: item.day,
      city: item.city,
      content: item.content,
      transport: item.transport,
      ticket: item.ticket,
      link: item.link,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        id={id}
        className="scroll-target bg-white rounded-lg shadow-md mb-4 overflow-hidden ring-2 ring-gold"
      >
        <div className="bg-gradient-to-r from-gold/20 to-gold/10 px-4 py-3 border-b border-gold/20">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-gold text-sm">
              {item.day}
            </span>
            <span className="font-serif text-xs text-ink/60">
              {item.date} ({item.weekday})
            </span>
            <span className="ml-auto text-xs text-gold font-display">
              編輯中...
            </span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs font-display text-ink/50 uppercase tracking-wide">
              城市
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 px-3 py-2 font-serif text-sm rounded-lg focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-display text-ink/50 uppercase tracking-wide">
              行程內容
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 px-3 py-2 font-serif text-sm rounded-lg focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors leading-relaxed"
            ></textarea>
          </div>
          <div>
            <label className="text-xs font-display text-ink/50 uppercase tracking-wide">
              交通備註
            </label>
            <input
              type="text"
              name="transport"
              value={formData.transport}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 px-3 py-2 font-serif text-sm rounded-lg focus:outline-none focus:border-gold transition-colors"
              placeholder="選填"
            />
          </div>
          <div>
            <label className="text-xs font-display text-ink/50 uppercase tracking-wide">
              票務資訊
            </label>
            <input
              type="text"
              name="ticket"
              value={formData.ticket}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 px-3 py-2 font-serif text-sm rounded-lg focus:outline-none focus:border-gold transition-colors"
              placeholder="選填"
            />
          </div>
          <div>
            <label className="text-xs font-display text-ink/50 uppercase tracking-wide">
              參考連結
            </label>
            <textarea
              name="link"
              value={formData.link}
              onChange={handleChange}
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 px-3 py-2 font-serif text-sm rounded-lg focus:outline-none focus:border-gold transition-colors"
              placeholder="每行一個連結，支援多筆網址"
            />
          </div>
        </div>
        <div className="flex gap-2 p-4 pt-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gold text-white py-2.5 font-display text-sm rounded-lg hover:bg-gold/90 transition-colors shadow-sm"
          >
            {saving ? '儲存中...' : '儲存'}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="flex-1 bg-gray-100 text-ink/70 py-2.5 font-display text-sm rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id={id}
      className="scroll-target itinerary-card"
    >
      {/* Header */}
      <div className="itinerary-card-header">
        <div className="itinerary-date-row">
          <span className="font-display font-bold text-gold text-base">
            {item.day}
          </span>
          <span className="font-serif text-sm text-ink/50">
            {item.date.replace(/^\d{4}[\/\-]/, '').replace(/[\/\-]\d{4}$/, '')} ({item.weekday})
          </span>
          <div className="ml-auto flex items-center gap-1">
            {hasTickets ? (
              <button
                type="button"
                onClick={() => setShowTickets(true)}
                className="inline-flex items-center rounded-full bg-gold px-2.5 py-1 text-white shadow-sm transition-colors hover:bg-gold/90"
                title={`當日票券（${dayTickets.length} 張）`}
                aria-label={`查看當日票券（${dayTickets.length} 張）`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
                <span className="ml-1 font-serif text-sm leading-none">
                  {dayTickets.length}
                </span>
              </button>
            ) : null}
            {hasReferenceLinks ? (
              <button
                type="button"
                onClick={() => setShowReferenceLinks(true)}
                className="inline-flex items-center rounded-full bg-deep-blue/10 px-2.5 py-1 text-deep-blue shadow-sm transition-colors hover:bg-deep-blue/20"
                title={`參考連結（${referenceLinks.length} 筆）`}
                aria-label={`查看參考連結（${referenceLinks.length} 筆）`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 016.364 6.364l-3.182 3.182a4.5 4.5 0 01-6.364 0m-1.198-2.884a4.5 4.5 0 01-6.364-6.364l3.182-3.182a4.5 4.5 0 016.364 0" />
                </svg>
                <span className="ml-1 font-serif text-sm leading-none">
                  {referenceLinks.length}
                </span>
              </button>
            ) : null}
            <button
                type="button"
                onClick={() => setIsEditing(true)}
                disabled={!canEdit}
                className="itinerary-edit-button"
                title={canEdit ? '編輯' : '需編輯權限'}
                aria-label={canEdit ? '編輯行程' : '編輯行程（需編輯權限）'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
              </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="itinerary-card-body">
        <h2 className="itinerary-city">{item.city}</h2>
        <div className="itinerary-schedule">
          <div className="itinerary-events">
            <ul>
              {itineraryLines.map((line, lineIndex) => (
                <li key={lineIndex} className="itinerary-event">
                  <span className="itinerary-event-copy" dangerouslySetInnerHTML={{ __html: line }} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Travel info */}
        {(item.transport || item.ticket || item.hotel) && (
          <div className="itinerary-travel-info">
            {item.transport && (
              <div className="itinerary-info-row">
                <span className="itinerary-info-label">交通</span>
                <span className="font-serif" dangerouslySetInnerHTML={{ __html: item.transport }} />
              </div>
            )}
            {item.ticket && (
              <div className="itinerary-info-row">
                <span className="itinerary-info-label">票務</span>
                <div className="min-w-0 flex-1">
                  <span
                    className="font-serif"
                    dangerouslySetInnerHTML={{ __html: item.ticket }}
                  />
                </div>
              </div>
            )}
            {item.hotel && (
              <div className="itinerary-info-row">
                <span className="itinerary-info-label">住宿</span>
                <span className="font-serif" dangerouslySetInnerHTML={{ __html: item.hotel }} />
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="itinerary-card-actions">
          <button
            onClick={() => setShowDetail(true)}
            className={itineraryActionButtonClassName}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={itineraryActionIconClassName}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            規劃
          </button>
          {hasNavigation && (
            <button
              onClick={() => setShowMap(true)}
              className={itineraryActionButtonClassName}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={itineraryActionIconClassName}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              地圖
            </button>
          )}
          <button
            onClick={() => setShowFood(true)}
            className={itineraryActionButtonClassName}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={itineraryActionIconClassName}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 2v7c0 1.1.9 2 2 2h0c1.1 0 2-.9 2-2V2m0 9v11m14-7V2m0 13a2 2 0 01-2 2h-1a2 2 0 01-2-2V2" />
            </svg>
            美食
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      <DetailModal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        dayKey={item.day}
        city={item.city}
        detail={detailData}
      />

      {/* Map Modal */}
      <MapModal
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        dayKey={item.day}
        city={item.city}
        navigationData={dayNavigation}
      />

      {/* Food Modal */}
      <FoodModal
        isOpen={showFood}
        onClose={() => setShowFood(false)}
        dayKey={item.day}
        city={item.city}
        itineraryContent={item.content}
        canEdit={canEdit}
        savedData={foodData}
        onFoodGenerated={onFoodUpdate}
      />
      {showTickets && (
        <TicketModal
          day={item.day}
          city={item.city}
          tickets={dayTickets}
          canViewTickets={canEdit}
          onPermissionChange={onPermissionChange}
          onClose={() => setShowTickets(false)}
        />
      )}
      {showReferenceLinks && (
        <ReferenceLinksModal
          day={item.day}
          city={item.city}
          links={referenceLinks}
          onClose={() => setShowReferenceLinks(false)}
        />
      )}
    </div>
  );
}
