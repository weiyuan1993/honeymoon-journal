import { useState } from 'react';
import type {
  ItineraryItem,
  JourneyContent,
  ReferenceLink,
  TicketItem,
  TodoItem,
  UserPermission,
} from '@/types';
import { htmlToText } from '@/utils/htmlToText';
import {
  buildTripTimeline,
  getFocusDayAction,
  getTripCountry,
} from './dashboardData';
import {
  getJourneyCityContent,
  getPrimaryTripCity,
} from '@/utils/tripLocations';
import {
  filterReferenceLinks,
  getReferenceHostname,
} from './referenceLinksData';
import TicketModal from './TicketModal';

interface TripDashboardProps {
  itinerary: ItineraryItem[];
  itineraryError: boolean;
  journeyContent: JourneyContent | null;
  tickets: TicketItem[];
  todos: TodoItem[];
  todosLoading: boolean;
  todosError: boolean;
  referenceLinks: ReferenceLink[];
  referenceLinksLoading: boolean;
  referenceLinksError: boolean;
  onOpenItinerary: () => void;
  onOpenJourney: (city?: string) => void;
  onOpenTickets: () => void;
  onOpenTodo: (rowNumber?: number) => void;
  onOpenLinks: () => void;
  canViewTickets: boolean;
  onPermissionChange?: (permission: UserPermission) => void;
}

const formatDate = (value: string) => {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value.trim());
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
};

interface CityHeroCopy {
  englishName: string;
  title: string;
}

const DEFAULT_CITY_HERO: CityHeroCopy = {
  englishName: 'EUROPE',
  title: '把每一段旅程，',
};

const COUNTRY_FLAGS: Record<string, string> = {
  英國: '🇬🇧',
  法國: '🇫🇷',
  瑞士: '🇨🇭',
  義大利: '🇮🇹',
};

const CITY_HERO_COPY: Record<string, CityHeroCopy> = {
  倫敦: {
    englishName: 'LONDON',
    title: '把英倫的從容，',
  },
  巴黎: {
    englishName: 'PARIS',
    title: '把巴黎的浪漫，',
  },
  琉森: {
    englishName: 'LUCERNE',
    title: '把湖畔的寧靜，',
  },
  格林德瓦: {
    englishName: 'GRINDELWALD',
    title: '把山谷的晨光，',
  },
  因特拉肯: {
    englishName: 'INTERLAKEN',
    title: '把湖山的遼闊，',
  },
  茵特拉肯: {
    englishName: 'INTERLAKEN',
    title: '把湖山的遼闊，',
  },
  策馬特: {
    englishName: 'ZERMATT',
    title: '把雪峰的心跳，',
  },
  蘇黎世: {
    englishName: 'ZURICH',
    title: '把城市與湖光，',
  },
  米蘭: {
    englishName: 'MILAN',
    title: '把米蘭的風格，',
  },
  威尼斯: {
    englishName: 'VENICE',
    title: '把水巷的倒影，',
  },
  佛羅倫斯: {
    englishName: 'FLORENCE',
    title: '把文藝的餘暉，',
  },
  比薩: {
    englishName: 'PISA',
    title: '把斜塔的午後，',
  },
  羅馬: {
    englishName: 'ROME',
    title: '把永恆城的黃昏，',
  },
};

export default function TripDashboard({
  itinerary,
  itineraryError,
  journeyContent,
  tickets,
  todos,
  todosLoading,
  todosError,
  referenceLinks,
  referenceLinksLoading,
  referenceLinksError,
  onOpenItinerary,
  onOpenJourney,
  onOpenTickets,
  onOpenTodo,
  onOpenLinks,
  canViewTickets,
  onPermissionChange,
}: TripDashboardProps) {
  const [showFocusTickets, setShowFocusTickets] = useState(false);
  const timeline = buildTripTimeline(itinerary);
  const pendingTodos = todos.filter((todo) => !todo.done);
  const heroCopy = {
    before: {
      intro: '行程、票券、待辦與實用連結都集中在這裡；出發前看一眼，就知道下一步。',
      eyebrow: 'DEPARTURE',
      value: timeline.daysToStart ?? '—',
      label: 'days to London',
    },
    during: {
      intro: '先看今天的安排、下一段交通與即將使用的票券，再放心享受當下。',
      eyebrow: 'TODAY',
      value: timeline.currentDayNumber ?? '—',
      label: `day of ${timeline.totalDays}`,
    },
    after: {
      intro: '旅程已完成，回到旅程故事重溫一路上的城市與回憶。',
      eyebrow: 'MEMORIES',
      value: timeline.totalDays || '—',
      label: 'days together',
    },
  }[timeline.phase];

  const focusItem = timeline.focusItem;
  const lastItem = timeline.lastDatedItem;
  const contextItem = focusItem ?? lastItem;
  const contextCity = getPrimaryTripCity(contextItem?.city ?? '');
  const mappedCityHero = CITY_HERO_COPY[contextCity];
  const cityHero = mappedCityHero ?? DEFAULT_CITY_HERO;
  const heroCity = contextCity || '歐洲';
  const heroEnglishName =
    mappedCityHero?.englishName ??
    (contextCity ? '' : DEFAULT_CITY_HERO.englishName);
  const currentCountry = getTripCountry(contextItem?.city ?? '');
  const heroCountry = currentCountry ?? '歐盟';
  const heroFlag = COUNTRY_FLAGS[heroCountry] ?? '🇪🇺';
  const currentCountryLinks = currentCountry
    ? filterReferenceLinks(referenceLinks, currentCountry, '').slice(0, 4)
    : [];
  const focusDayAction = getFocusDayAction(focusItem, tickets);
  const heroStory =
    getJourneyCityContent(journeyContent?.cities, contextCity) || heroCopy.intro;
  let countdownDetail = '等待行程資料';
  if (itineraryError) {
    countdownDetail = '行程暫時無法載入';
  } else if (focusItem) {
    countdownDetail = formatDate(focusItem.date);
  } else if (lastItem) {
    countdownDetail = `完成於 ${formatDate(lastItem.date)}`;
  }

  return (
    <div className="dashboard-shell animate-fade-in-up">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="eyebrow dashboard-location">
            <span
              className="dashboard-location-flag"
              role="img"
              aria-label={`${heroCountry}國旗`}
            >
              {heroFlag}
            </span>
            {heroCity}
            {heroEnglishName && ` · ${heroEnglishName}`}
          </p>
          <h2>
            {cityHero.title}
            <br />
            <em>留給當下。</em>
          </h2>
          <p className="dashboard-intro">{heroStory}</p>
          <div className="dashboard-actions">
            <button type="button" onClick={onOpenItinerary}>查看完整行程</button>
            <button
              type="button"
              className="secondary"
              onClick={() => onOpenJourney(contextCity || undefined)}
            >
              閱讀旅程故事
            </button>
            <button type="button" className="secondary" onClick={onOpenTickets}>
              開啟票券庫
            </button>
          </div>
        </div>
        <div className="countdown-card" aria-label={heroCopy.eyebrow}>
          <span>{heroCopy.eyebrow}</span>
          <strong>{heroCopy.value}</strong>
          <small>{heroCopy.label}</small>
          <div>{countdownDetail}</div>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="next-stop-card">
          <div className="section-heading">
            <span>
              {timeline.phase === 'during' && timeline.focusIsToday
                ? 'TODAY'
                : 'UP NEXT'}
            </span>
            <button type="button" onClick={onOpenItinerary}>所有行程 →</button>
          </div>
          {focusItem ? (
            <>
              <p className="next-date">
                {focusItem.day} · {formatDate(focusItem.date)}
              </p>
              <h3>{focusItem.city}</h3>
              <p>{htmlToText(focusItem.content)}</p>
              {focusDayAction && (
                <div className="focus-ticket-actions">
                  {focusDayAction.type === 'tickets' ? (
                    <button
                      type="button"
                      onClick={() => setShowFocusTickets(true)}
                    >
                      當日票券 {focusDayAction.tickets.length} 張
                    </button>
                  ) : (
                    <button type="button" onClick={onOpenItinerary}>
                      當日參考連結 {focusDayAction.count} 筆
                    </button>
                  )}
                </div>
              )}
              {focusItem.hotel && (
                <div className="stay-line">🏨 {htmlToText(focusItem.hotel)}</div>
              )}
            </>
          ) : itineraryError ? (
            <>
              <p className="next-date">UNAVAILABLE</p>
              <h3>行程暫時無法載入</h3>
              <p>請稍後重新整理，再查看最新行程。</p>
            </>
          ) : itinerary.length === 0 ? (
            <p className="empty-copy">尚未載入行程。</p>
          ) : (
            <>
              <p className="next-date">JOURNEY COMPLETE</p>
              <h3>旅程已經完成</h3>
              <p>回到旅程故事，重新走過這三十天的城市與風景。</p>
            </>
          )}
        </article>

      </section>

      <section className="todo-preview">
        <div className="section-heading">
          <span>NEXT ACTIONS</span>
          <button type="button" onClick={() => onOpenTodo()}>
            {todosLoading || todosError
              ? '查看全部 →'
              : `查看全部 ${pendingTodos.length} 項 →`}
          </button>
        </div>
        <div className="todo-preview-list">
          {!todosLoading && !todosError && pendingTodos.slice(0, 3).map((todo) => (
            <button
              type="button"
              key={todo.rowNumber}
              onClick={() => onOpenTodo(todo.rowNumber)}
            >
              <span aria-hidden="true" />
              <div>
                <strong>{htmlToText(todo.item)}</strong>
                <small>
                  {htmlToText(todo.detail)}
                </small>
              </div>
            </button>
          ))}
          {todosLoading && (
            <p className="empty-copy">正在同步待辦…</p>
          )}
          {todosError && (
            <p className="empty-copy">待辦暫時無法載入。</p>
          )}
          {!todosLoading && !todosError && pendingTodos.length === 0 && (
            <p className="empty-copy">目前沒有未完成待辦。</p>
          )}
        </div>
      </section>

      <section className="useful-links">
        <div className="useful-links-heading">
          <div>
            <p className="eyebrow">TRAVEL TOOLKIT</p>
            <h3>實用連結</h3>
          </div>
          <div className="useful-links-meta">
            <button type="button" onClick={onOpenLinks}>
              查看全部 →
            </button>
          </div>
        </div>
        <div className="useful-link-grid">
          {currentCountryLinks.map((link) => (
            <a
              key={`${link.category}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>↗</span>
              <strong>{link.label}</strong>
              <small>{getReferenceHostname(link.url)}</small>
            </a>
          ))}
          {referenceLinksLoading && (
            <p className="empty-copy">正在同步實用連結…</p>
          )}
          {referenceLinksError && (
            <p className="empty-copy">實用連結暫時無法載入。</p>
          )}
          {!referenceLinksLoading &&
            !referenceLinksError &&
            currentCountryLinks.length === 0 && (
              <p className="empty-copy">目前沒有可顯示的實用連結。</p>
            )}
        </div>
      </section>

      {showFocusTickets &&
        focusItem &&
        focusDayAction?.type === 'tickets' && (
        <TicketModal
          day={focusItem.day}
          city={focusItem.city}
          tickets={focusDayAction.tickets}
          canViewTickets={canViewTickets}
          onPermissionChange={onPermissionChange}
          onClose={() => setShowFocusTickets(false)}
        />
      )}
    </div>
  );
}
