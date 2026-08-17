import type { ItineraryReferenceLink } from '@/types';

interface ReferenceLinksModalProps {
  day: string;
  city: string;
  links: ItineraryReferenceLink[];
  onClose: () => void;
}

export default function ReferenceLinksModal({
  day,
  city,
  links,
  onClose,
}: ReferenceLinksModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        aria-label="關閉參考連結"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reference-links-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-gold/20 px-4 py-3">
          <div className="min-w-0">
            <p className="font-display text-[13px] uppercase tracking-[0.16em] text-gold">
              {day} · {city}
            </p>
            <h2 id="reference-links-title" className="mt-1 font-display text-base text-ink">
              參考連結
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink/45 transition-colors hover:bg-gray-100 hover:text-ink"
            aria-label="關閉"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>
        <ul className="space-y-2 overflow-y-auto p-4">
          {links.map((link, index) => (
            <li key={`${link.url}-${index}`}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-deep-blue/10 bg-deep-blue/[0.03] px-4 py-3 font-serif text-sm text-deep-blue transition-colors hover:border-deep-blue/30 hover:bg-deep-blue/10"
              >
                <span className="min-w-0 break-words">{link.label}</span>
                <span className="shrink-0" aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
