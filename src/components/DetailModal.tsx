import { useEffect } from 'react';
import type { AttractionDetail } from '@/types';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayKey: string;
  city: string;
  detail: AttractionDetail | undefined;
}

export default function DetailModal({
  isOpen,
  onClose,
  dayKey,
  city,
  detail,
}: DetailModalProps) {
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="trip-modal-overlay"
      onClick={onClose}
    >
      {/* Background overlay */}
      <div className="trip-modal-backdrop"></div>

      {/* Modal content */}
      <div
        className="trip-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="trip-modal-header">
          <span className="trip-modal-title">
            {dayKey} · {city} · 行程規劃
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

        {/* Content area */}
        <div className="trip-modal-body custom-scrollbar">
          {detail?.content ? (
            <div className="trip-modal-copy whitespace-pre-line">
              {detail.content}
            </div>
          ) : (
            <p className="text-center py-8 text-sm text-gray-500">尚無景點規劃</p>
          )}
        </div>
      </div>
    </div>
  );
}
