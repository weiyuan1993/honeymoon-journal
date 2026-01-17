import { useState, useEffect } from 'react';
import type {
  ItineraryItem,
  ItineraryFormData,
  NavigationData,
  AttractionDetails,
  FoodRecommendations,
} from '@/types';
import { gasClient } from '@/utils/gasClient';
import DetailModal from './DetailModal';
import MapModal from './MapModal';
import FoodModal from './FoodModal';

interface ItineraryCardProps {
  item: ItineraryItem;
  id: string;
  onUpdate: () => void;
  navigationData: NavigationData;
  attractionDetails: AttractionDetails;
  foodRecommendations: FoodRecommendations;
  onFoodUpdate: () => void;
  canEdit: boolean;
}

export default function ItineraryCard({
  item,
  id,
  onUpdate,
  navigationData,
  attractionDetails,
  foodRecommendations,
  onFoodUpdate,
  canEdit,
}: ItineraryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ItineraryFormData>({
    rowNumber: item.rowNumber,
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

  // Check if there's detail data for this day
  const detailData = attractionDetails && attractionDetails[item.day];

  // Check if there's coordinate data for this day
  const coordData = navigationData && navigationData[item.day];
  const hasCoordinates = !!coordData;

  // Check if there's food data for this day
  const foodData = foodRecommendations && foodRecommendations[item.day];

  useEffect(() => {
    setFormData({
      rowNumber: item.rowNumber,
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
    setSaving(true);
    try {
      const res = await gasClient.editItinerary(formData);
      if (res.success) {
        setIsEditing(false);
        onUpdate();
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
        className="scroll-target relative bg-white border-2 border-gold p-5 mb-5 shadow-md rounded-sm"
      >
        <div className="flex items-baseline gap-2 border-b border-subtle pb-2 mb-3">
          <span className="font-display font-bold text-gray-400 text-xl">
            {item.day}
          </span>
          <span className="font-serif text-sm text-gray-400">
            {item.date} ({item.weekday})
          </span>
          <span className="ml-auto text-xs text-gold font-bold">
            EDITING...
          </span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full border p-2 font-serif bg-paper"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Content
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              className="w-full border p-2 font-serif bg-paper leading-relaxed"
            ></textarea>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Transport Note
            </label>
            <input
              type="text"
              name="transport"
              value={formData.transport}
              onChange={handleChange}
              className="w-full border p-2 font-serif bg-paper"
              placeholder="交通備註 (選填)"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Ticket Info
            </label>
            <input
              type="text"
              name="ticket"
              value={formData.ticket}
              onChange={handleChange}
              className="w-full border p-2 font-serif bg-paper"
              placeholder="票務資訊 (選填)"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Link URL
            </label>
            <input
              type="text"
              name="link"
              value={formData.link}
              onChange={handleChange}
              className="w-full border p-2 font-serif bg-paper text-sm"
              placeholder="購票連結 (選填)"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-forest text-white py-2 font-display text-sm hover:bg-green-800 transition"
          >
            {saving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="flex-1 bg-gray-200 text-gray-600 py-2 font-display text-sm hover:bg-gray-300 transition"
          >
            CANCEL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id={id}
      className="scroll-target relative bg-white border border-subtle p-6 mb-5 shadow-sm rounded-sm transition-all duration-500 target:border-gold target:shadow-md target:bg-orange-50/30 group"
    >
      <div className="absolute inset-1 border border-subtle pointer-events-none opacity-50"></div>

      <div className="relative z-10">
        {/* Header - compact single row */}
        <div className="border-b border-gold pb-2 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="font-display font-bold text-gold text-sm">
              {item.day}
            </span>
            <span className="font-serif text-xs text-gray-500">
              {item.date.replace(/^\d{4}[\/\-]/, '').replace(/[\/\-]\d{4}$/, '')} ({item.weekday})
            </span>
            <div className="ml-auto flex items-center gap-1">
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-wax hover:text-wax/70 transition-colors p-1"
                  title="票務連結"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                  </svg>
                </a>
              )}
              {hasCoordinates && (
                <button
                  onClick={() => setShowMap(true)}
                  className="text-forest hover:text-forest/70 transition-colors p-1"
                  title="景點地圖"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gold/60 hover:text-gold transition-colors p-1"
                  title="編輯"
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
              )}
            </div>
          </div>
        </div>

        {/* City + Content - Magazine style */}
        <div className="mb-4 pl-4 border-l-[3px] border-gold">
          <div className="font-display font-bold text-forest text-xs mb-2">
            📍 {item.city}
          </div>
          <div
            className="text-[15px] leading-relaxed text-ink font-serif"
            dangerouslySetInnerHTML={{ __html: item.content }}
          />
        </div>

        {/* Travel info - each on separate row */}
        {(item.transport || item.ticket || item.hotel) && (
          <div className="space-y-1.5 text-xs mb-4">
            {item.transport && (
              <div className="flex items-start gap-1.5 text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded">
                <span>🚌</span>
                <span dangerouslySetInnerHTML={{ __html: item.transport }} />
              </div>
            )}
            {item.ticket && (
              <div className="flex items-start gap-1.5 text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded">
                <span>🎟️</span>
                <span dangerouslySetInnerHTML={{ __html: item.ticket }} />
              </div>
            )}
            {item.hotel && (
              <div className="flex items-start gap-1.5 text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded">
                <span>🏨</span>
                <span dangerouslySetInnerHTML={{ __html: item.hotel }} />
              </div>
            )}
          </div>
        )}

        {/* Action buttons - simplified */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setShowDetail(true)}
            className="flex-1 py-2.5 px-3 bg-gold/10 hover:bg-gold/20 border border-gold text-ink font-serif text-xs rounded-sm transition-all flex items-center justify-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-gold">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            規劃
          </button>
          <button
            onClick={() => setShowFood(true)}
            className="flex-1 py-2.5 px-3 bg-orange-50 hover:bg-orange-100 border border-orange-300 text-orange-700 font-serif text-xs rounded-sm transition-all flex items-center justify-center gap-1"
          >
            🍽️ 美食
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
        itineraryContent={item.content}
        canEdit={canEdit}
      />

      {/* Map Modal */}
      <MapModal
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        dayKey={item.day}
        city={item.city}
        coordData={coordData}
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
    </div>
  );
}
