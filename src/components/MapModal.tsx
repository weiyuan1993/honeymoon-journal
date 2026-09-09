import { useState, useEffect } from 'react';
import type { DayNavigationData } from '@/types';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayKey: string;
  city: string;
  navigationData: DayNavigationData | undefined;
}

export default function MapModal({
  isOpen,
  onClose,
  dayKey,
  city,
  navigationData,
}: MapModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) setSelectedIndex(0);
  }, [isOpen, dayKey]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !navigationData) return null;

  const selectedAttr = navigationData.attractions[selectedIndex];
  const encodedQuery = encodeURIComponent(selectedAttr.query);
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodedQuery}&z=16&output=embed`;

  return (
    <div
      className="trip-modal-overlay"
      onClick={onClose}
    >
      {/* Background overlay */}
      <div className="trip-modal-backdrop"></div>

      {/* Modal content */}
      <div
        className="trip-modal-panel trip-modal-map"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - compact version */}
        <div className="trip-modal-header">
          <span className="trip-modal-title">
            {dayKey} · {city} · 地圖
          </span>
          <button
            onClick={onClose}
            className="trip-modal-close"
            aria-label="關閉視窗"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Google Maps Embed area */}
        <div className="flex-1 relative min-h-0">
          <iframe
            src={mapEmbedUrl}
            title={`${city}：${selectedAttr.name}地圖`}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>

        {/* Attraction list - clickable to switch */}
        <div className="px-4 py-3 bg-white border-t border-subtle overflow-x-auto no-scrollbar">
          <div className="flex gap-2.5 whitespace-nowrap pb-1">
            {navigationData.attractions.map((attr, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`inline-flex items-center gap-2 px-3 py-2 border rounded-full text-sm font-serif transition-colors ${
                  selectedIndex === index
                    ? 'bg-deep-blue text-white border-deep-blue'
                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-ink'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold shrink-0 ${
                    selectedIndex === index
                      ? 'bg-white text-deep-blue'
                      : 'bg-deep-blue/10 text-deep-blue'
                  }`}
                >
                  {index + 1}
                </span>
                <span>{attr.name}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
