import { useMemo, useState } from 'react';
import type { ReferenceLink } from '@/types';
import Loading from './Loading';
import {
  filterReferenceLinks,
  getReferenceHostname,
  groupReferenceLinks,
} from './referenceLinksData';

interface UsefulLinksPageProps {
  links: ReferenceLink[];
  loading: boolean;
  error: boolean;
  onBack: () => void;
}

export default function UsefulLinksPage({
  links,
  loading,
  error,
  onBack,
}: UsefulLinksPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const linkGroups = useMemo(() => groupReferenceLinks(links), [links]);
  const categories = linkGroups.map((group) => group.category);
  const activeCategory =
    selectedCategory && categories.includes(selectedCategory)
      ? selectedCategory
      : null;
  const filteredLinks = useMemo(
    () => filterReferenceLinks(links, activeCategory, query),
    [activeCategory, links, query]
  );
  const visibleGroups = useMemo(
    () => groupReferenceLinks(filteredLinks),
    [filteredLinks]
  );

  return (
    <div className="links-page animate-fade-in-up">
      <header className="links-page-heading">
        <div>
          <button type="button" className="links-back" onClick={onBack}>
            ← 返回總覽
          </button>
          <p className="eyebrow">TRAVEL TOOLKIT</p>
          <h2>實用連結</h2>
          <p>依國家整理交通、景點、票券與旅遊攻略，內容同步自 Google Sheet。</p>
        </div>
        <div className="links-page-count" aria-label={`${links.length} 個連結`}>
          <strong>{links.length}</strong>
          <span>useful links</span>
        </div>
      </header>

      <div className="links-page-controls">
        <label className="links-search">
          <span className="sr-only">搜尋實用連結</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋景點、交通、備註或網站…"
          />
        </label>
        <div className="link-category-tabs" aria-label="連結國家分類">
          <button
            type="button"
            className={activeCategory === null ? 'active' : ''}
            aria-pressed={activeCategory === null}
            onClick={() => setSelectedCategory(null)}
          >
            全部
          </button>
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              className={category === activeCategory ? 'active' : ''}
              aria-pressed={category === activeCategory}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <p className="links-page-state">實用連結暫時無法載入，請稍後再試。</p>
      ) : filteredLinks.length === 0 ? (
        <p className="links-page-state">沒有符合條件的連結。</p>
      ) : (
        <div className="links-country-list">
          {visibleGroups.map((group) => (
            <section className="links-country-section" key={group.category}>
              <div className="links-country-heading">
                <h3>{group.category}</h3>
                <span>{group.links.length} 個連結</span>
              </div>
              <div className="links-page-grid">
                {group.links.map((link) => (
                  <a
                    key={`${link.category}-${link.url}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="link-arrow" aria-hidden="true">
                      ↗
                    </span>
                    <strong>{link.label}</strong>
                    <small>{getReferenceHostname(link.url)}</small>
                    {link.note ? <p>{link.note}</p> : null}
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
