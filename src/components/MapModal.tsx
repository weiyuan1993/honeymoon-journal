import { useState, useEffect } from 'react';
import type { DayNavigationData } from '@/types';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayKey: string;
  city: string;
  coordData: DayNavigationData | undefined;
}

export default function MapModal({
  isOpen,
  onClose,
  dayKey,
  city,
  coordData,
}: MapModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) setSelectedIndex(0);
  }, [isOpen, dayKey]);

  if (!isOpen || !coordData) return null;

  const selectedAttr = coordData.attractions[selectedIndex];
  const mapEmbedUrl = `https://maps.google.com/maps?q=${selectedAttr.lat},${selectedAttr.lng}&z=16&output=embed`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm"></div>

      {/* Modal content */}
      <div
        className="relative bg-paper border-2 border-gold shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-sm flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - compact version */}
        <div className="bg-gold/10 px-4 h-10 border-b border-gold flex items-center justify-between">
          <div className="w-8"></div>
          <div className="flex items-center gap-3">
            <span className="font-display text-xs text-gold tracking-wider">
              {dayKey}
            </span>
            <span className="text-gold">·</span>
            <span className="font-display text-sm text-ink">
              {city} 景點地圖
            </span>
            <span className="text-gold">·</span>
            <span className="font-serif text-xs text-gray-500">
              {coordData.attractions.length} 處
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-ink transition-colors"
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
        <div className="flex-1 relative" style={{ minHeight: '340px' }}>
          <iframe
            src={mapEmbedUrl}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>

        {/* Attraction list - clickable to switch */}
        <div className="px-4 py-3 bg-white border-t border-subtle overflow-x-auto no-scrollbar">
          <div className="flex gap-2.5 whitespace-nowrap pb-1">
            {coordData.attractions.map((attr, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`inline-flex items-center gap-2 px-3 py-2 border rounded-full text-sm font-serif transition-colors ${
                  selectedIndex === index
                    ? 'bg-gold text-white border-gold shadow-sm'
                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-ink'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold shrink-0 ${
                    selectedIndex === index
                      ? 'bg-white text-gold'
                      : 'bg-gold text-white'
                  }`}
                >
                  {index + 1}
                </span>
                <span>{attr.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom navigation button */}
        <div className="px-3 py-2 border-t border-gold-light bg-gradient-to-t from-gold-light/20 to-transparent">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${selectedAttr.lat},${selectedAttr.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 bg-forest text-white font-display text-sm tracking-wider hover:bg-green-800 transition-colors rounded-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
              />
            </svg>
            導航至 {selectedAttr.name}
          </a>
        </div>
      </div>
    </div>
  );
}
