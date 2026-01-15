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
  if (!isOpen || !detail) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm"></div>

      {/* Modal content */}
      <div
        className="relative bg-paper border-2 border-gold shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden rounded-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative border */}
        <div className="absolute inset-2 border border-gold-light pointer-events-none"></div>

        {/* Header */}
        <div className="bg-gradient-to-b from-gold-light/30 to-transparent p-6 pb-4 border-b border-gold">
          <div className="text-center">
            <div className="inline-block px-4 py-1 bg-gold/10 border border-gold rounded-full mb-2">
              <span className="font-display text-xs text-gold tracking-widest">
                {dayKey}
              </span>
            </div>
            <h2 className="font-display text-xl text-ink tracking-wide">
              {detail.title}
            </h2>
            <p className="font-serif text-sm text-gray-500 mt-1 italic">
              {city}
            </p>
          </div>
        </div>

        {/* Content area */}
        <div className="p-6 overflow-y-auto max-h-[50vh] custom-scrollbar">
          <div className="font-serif text-ink leading-loose text-[15px] whitespace-pre-line">
            {detail.content}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gold-light bg-gradient-to-t from-gold-light/20 to-transparent">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-ink text-white font-display text-sm tracking-wider hover:bg-gray-800 transition-colors rounded-sm"
          >
            CLOSE
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-ink transition-colors"
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
    </div>
  );
}
