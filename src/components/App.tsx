import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type {
  ItineraryItem,
  ItineraryFormData,
  NavigationData,
  AttractionDetails,
  FoodRecommendations,
  UserPermission,
  JourneyContent,
  ReferenceLink,
  TicketItem,
  TodoItem,
} from '@/types';
import { tripConfig } from '@/config/trip.config';
import { tripClient } from '@/utils/tripClient';
import ItineraryCard from './ItineraryCard';
import ExpensePage from './ExpensePage';
import JourneyPage from './JourneyPage';
import TodoPage from './TodoPage';
import Loading from './Loading';
import TripSecretaryModal from './TripSecretaryModal';
import TripDashboard from './TripDashboard';
import TicketVaultPage from './TicketVaultPage';
import AuthButton from './AuthButton';
import UsefulLinksPage from './UsefulLinksPage';

const TAB_IDS = {
  DASHBOARD: 'dashboard',
  JOURNEY: 'journey',
  ITINERARY: 'itinerary',
  TICKETS: 'tickets',
  EXPENSE: 'expense',
  TODO: 'todo',
  LINKS: 'links',
} as const;

type TabType = (typeof TAB_IDS)[keyof typeof TAB_IDS];
type LazyDataKey =
  | 'itinerary'
  | 'navigation'
  | 'tickets'
  | 'attractionDetails'
  | 'foodRecommendations'
  | 'journeyContent'
  | 'referenceLinks'
  | 'todos';

const DEFAULT_TAB: TabType = TAB_IDS.DASHBOARD;
const ACTIVE_TAB_STORAGE_KEY = 'activeTab';
const BOTTOM_NAV_EXPAND_SCROLL_Y = 24;
const BOTTOM_NAV_DIRECTION_DELTA = 8;

const bottomTabs = [
  { id: TAB_IDS.DASHBOARD, label: '總覽' },
  { id: TAB_IDS.ITINERARY, label: '行程' },
  { id: TAB_IDS.TICKETS, label: '票券' },
  { id: TAB_IDS.EXPENSE, label: '花費' },
  { id: TAB_IDS.TODO, label: '待辦' },
] satisfies Array<{ id: TabType; label: string }>;

const validTabs = new Set<TabType>(Object.values(TAB_IDS));

const isTabType = (value: string | null): value is TabType =>
  !!value && validTabs.has(value as TabType);

function TabIcon({ tab }: { tab: TabType }) {
  const iconClass = 'h-6 w-6';

  switch (tab) {
    case TAB_IDS.DASHBOARD:
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
        </svg>
      );
    case TAB_IDS.JOURNEY:
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 19.5V5.75A2.75 2.75 0 0 1 6.75 3H20v15H6.75A2.75 2.75 0 0 0 4 20.75" />
          <path d="M8 7h8" />
          <path d="M8 11h6" />
        </svg>
      );
    case TAB_IDS.ITINERARY:
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8 2.5v3" />
          <path d="M16 2.5v3" />
          <path d="M4.5 9h15" />
          <path d="M6.75 4h10.5A2.25 2.25 0 0 1 19.5 6.25v11A2.25 2.25 0 0 1 17.25 19.5H6.75A2.25 2.25 0 0 1 4.5 17.25v-11A2.25 2.25 0 0 1 6.75 4Z" />
          <path d="M8 13h.01" />
          <path d="M12 13h.01" />
          <path d="M16 13h.01" />
        </svg>
      );
    case TAB_IDS.TICKETS:
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v3a2 2 0 0 0 0 4v3a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-3a2 2 0 0 0 0-4Z" />
          <path d="M12 7v10" />
        </svg>
      );
    case TAB_IDS.TODO:
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 11.5 11 13.5 15.5 8.5" />
          <path d="M5.75 4h12.5A1.75 1.75 0 0 1 20 5.75v12.5A1.75 1.75 0 0 1 18.25 20H5.75A1.75 1.75 0 0 1 4 18.25V5.75A1.75 1.75 0 0 1 5.75 4Z" />
        </svg>
      );
    case TAB_IDS.EXPENSE:
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M7 3.5h10A1.5 1.5 0 0 1 18.5 5v16l-2.25-1.25L14 21l-2-1.25L10 21l-2.25-1.25L5.5 21V5A1.5 1.5 0 0 1 7 3.5Z" />
          <path d="M8.5 8h7" />
          <path d="M8.5 12h7" />
          <path d="M8.5 16h4" />
        </svg>
      );
  }
}

const getInitialTab = (): TabType => {
  // Try URL hash first (for local dev)
  const hash = window.location.hash.replace('#', '');
  if (isTabType(hash)) {
    return hash;
  }
  // Then try localStorage.
  try {
    const saved = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (isTabType(saved)) {
      return saved;
    }
  } catch {
    // localStorage not available
  }
  return DEFAULT_TAB;
};

export default function App() {
  const [tab, setTab] = useState<TabType>(getInitialTab);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [loadingItin, setLoadingItin] = useState(true);
  const [itineraryError, setItineraryError] = useState(false);
  const [navigationData, setNavigationData] = useState<NavigationData>({});
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(true);
  const [todosError, setTodosError] = useState(false);
  const [referenceLinks, setReferenceLinks] = useState<ReferenceLink[]>([]);
  const [loadingReferenceLinks, setLoadingReferenceLinks] = useState(false);
  const [referenceLinksError, setReferenceLinksError] = useState(false);
  const [attractionDetails, setAttractionDetails] = useState<AttractionDetails>(
    {}
  );
  const [foodRecommendations, setFoodRecommendations] = useState<FoodRecommendations>(
    {}
  );
  const [userPermission, setUserPermission] = useState<UserPermission>({
    email: null,
    canEdit: false,
  });
  const [showMenu, setShowMenu] = useState(false);
  const [isBottomNavCompact, setIsBottomNavCompact] = useState(false);
  const [journeyContent, setJourneyContent] = useState<JourneyContent | null>(null);
  const [journeyNavigation, setJourneyNavigation] = useState<{
    city: string | null;
    request: number;
  }>({ city: null, request: 0 });
  const [todoNavigation, setTodoNavigation] = useState<{
    rowNumber: number | null;
    request: number;
  }>({ rowNumber: null, request: 0 });
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [visitedTabs, setVisitedTabs] = useState<Set<TabType>>(
    () => new Set([getInitialTab()])
  );
  const loadedDataRef = useRef<Set<LazyDataKey>>(new Set());
  const loadingDataRef = useRef<Map<LazyDataKey, symbol>>(new Map());
  const authEpochRef = useRef(0);
  const canEditRef = useRef(false);
  const bottomNavScrollAnchorRef = useRef(0);

  // Sync tab with URL hash and localStorage
  useEffect(() => {
    setVisitedTabs((current) => {
      if (current.has(tab)) return current;
      const next = new Set(current);
      next.add(tab);
      return next;
    });

    // Save the active tab for the next visit.
    try {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
    } catch {
      // localStorage not available
    }
    // Also update the URL hash for navigation.
    if (window.location.hash !== `#${tab}`) {
      window.location.hash = tab;
    }
  }, [tab]);

  // Listen for browser back/forward navigation.
  useEffect(() => {
    const handleHashChange = () => {
      setTab(getInitialTab());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;

      if (scrollY <= BOTTOM_NAV_EXPAND_SCROLL_Y) {
        setIsBottomNavCompact(false);
        bottomNavScrollAnchorRef.current = scrollY;
        return;
      }

      const directionDelta = scrollY - bottomNavScrollAnchorRef.current;
      if (Math.abs(directionDelta) >= BOTTOM_NAV_DIRECTION_DELTA) {
        setIsBottomNavCompact(directionDelta > 0);
        bottomNavScrollAnchorRef.current = scrollY;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchItinerary = async (showBlockingLoading = true) => {
    const authEpoch = authEpochRef.current;
    if (showBlockingLoading) setLoadingItin(true);
    setItineraryError(false);
    try {
      const data = await tripClient.getItineraryData();
      if (authEpoch !== authEpochRef.current) return;
      setItinerary(data);
      loadedDataRef.current.add('itinerary');
    } catch (error) {
      if (authEpoch !== authEpochRef.current) return;
      if (itinerary.length === 0) setItineraryError(true);
      console.error('Failed to fetch itinerary:', error);
    } finally {
      if (showBlockingLoading && authEpoch === authEpochRef.current) {
        setLoadingItin(false);
      }
    }
  };

  const fetchNavigationData = async () => {
    try {
      const data = await tripClient.getNavigationData();
      setNavigationData(data || {});
      loadedDataRef.current.add('navigation');
    } catch (error) {
      console.error('Failed to fetch navigation data:', error);
    }
  };

  const fetchTicketData = async () => {
    const authEpoch = authEpochRef.current;
    try {
      const data = await tripClient.getTicketData();
      if (authEpoch !== authEpochRef.current) return;
      setTickets(data || []);
      loadedDataRef.current.add('tickets');
    } catch (error) {
      console.error('Failed to fetch ticket data:', error);
    }
  };

  const fetchAttractionDetails = async () => {
    try {
      const data = await tripClient.getAttractionDetails();
      setAttractionDetails(data || {});
      loadedDataRef.current.add('attractionDetails');
    } catch (error) {
      console.error('Failed to fetch attraction details:', error);
    }
  };

  const fetchFoodRecommendations = async () => {
    try {
      const data = await tripClient.getFoodRecommendations();
      setFoodRecommendations(data || {});
      loadedDataRef.current.add('foodRecommendations');
    } catch (error) {
      console.error('Failed to fetch food recommendations:', error);
    }
  };

  const fetchUserPermission = async () => {
    const authEpoch = authEpochRef.current;
    try {
      const data = await tripClient.getUserPermission();
      if (authEpoch !== authEpochRef.current) return;
      handlePermissionChange(data || { email: null, canEdit: false });
    } catch (error) {
      if (authEpoch !== authEpochRef.current) return;
      console.error('Failed to fetch user permission:', error);
    }
  };

  const handlePermissionChange = useCallback((permission: UserPermission) => {
    const accessChanged = canEditRef.current !== permission.canEdit;
    canEditRef.current = permission.canEdit;
    if (accessChanged) authEpochRef.current += 1;
    setUserPermission(permission);
    if (accessChanged) {
      setItinerary([]);
      setLoadingItin(true);
      loadedDataRef.current.delete('itinerary');
      loadingDataRef.current.delete('itinerary');
      loadingDataRef.current.delete('tickets');
    }
    if (!permission.canEdit) {
      setTickets([]);
      loadedDataRef.current.delete('tickets');
      setIsChatOpen(false);
    }
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => {
      handlePermissionChange({ email: null, canEdit: false });
    };
    window.addEventListener('honeymoon:session-expired', handleExpiredSession);
    return () => {
      window.removeEventListener('honeymoon:session-expired', handleExpiredSession);
    };
  }, [handlePermissionChange]);

  const fetchJourneyContent = async () => {
    try {
      const data = await tripClient.getJourneyContent();
      if (data) setJourneyContent(data);
      loadedDataRef.current.add('journeyContent');
    } catch (error) {
      console.error('Failed to fetch journey content:', error);
    }
  };

  const fetchTodos = async () => {
    setLoadingTodos(true);
    setTodosError(false);
    try {
      const data = await tripClient.getTodoData();
      setTodos(data || []);
      loadedDataRef.current.add('todos');
    } catch (error) {
      setTodosError(true);
      console.error('Failed to fetch todos:', error);
    } finally {
      setLoadingTodos(false);
    }
  };

  const fetchReferenceLinks = async () => {
    setLoadingReferenceLinks(true);
    setReferenceLinksError(false);
    try {
      const data = await tripClient.getReferenceLinks();
      setReferenceLinks(data || []);
      loadedDataRef.current.add('referenceLinks');
    } catch (error) {
      setReferenceLinksError(true);
      console.error('Failed to fetch reference links:', error);
    } finally {
      setLoadingReferenceLinks(false);
    }
  };

  const loadOnce = async (key: LazyDataKey, loader: () => Promise<void>) => {
    if (loadedDataRef.current.has(key) || loadingDataRef.current.has(key)) {
      return;
    }
    const requestToken = Symbol(key);
    loadingDataRef.current.set(key, requestToken);
    try {
      await loader();
    } finally {
      if (loadingDataRef.current.get(key) === requestToken) {
        loadingDataRef.current.delete(key);
      }
    }
  };

  useEffect(() => {
    if (
      tab !== TAB_IDS.DASHBOARD &&
      tab !== TAB_IDS.ITINERARY &&
      tab !== TAB_IDS.TICKETS &&
      tab !== TAB_IDS.TODO &&
      tab !== TAB_IDS.LINKS
    ) {
      return;
    }

    if (tab !== TAB_IDS.TODO && tab !== TAB_IDS.LINKS) {
      loadOnce('itinerary', fetchItinerary);
    }
    if (
      userPermission.canEdit &&
      (tab === TAB_IDS.DASHBOARD ||
        tab === TAB_IDS.ITINERARY ||
        tab === TAB_IDS.TICKETS)
    ) {
      loadOnce('tickets', fetchTicketData);
    }
    if (tab === TAB_IDS.DASHBOARD) {
      loadOnce('todos', fetchTodos);
      loadOnce('journeyContent', fetchJourneyContent);
    } else if (tab === TAB_IDS.TODO) {
      loadedDataRef.current.delete('todos');
      void loadOnce('todos', fetchTodos);
    }
    if (tab === TAB_IDS.DASHBOARD || tab === TAB_IDS.LINKS) {
      loadOnce('referenceLinks', fetchReferenceLinks);
    }
    if (tab === TAB_IDS.ITINERARY) {
      loadOnce('navigation', fetchNavigationData);
      loadOnce('attractionDetails', fetchAttractionDetails);
      loadOnce('foodRecommendations', fetchFoodRecommendations);
    }
  }, [tab, userPermission.canEdit]);

  useEffect(() => {
    if (tab !== TAB_IDS.JOURNEY) return;

    loadOnce('itinerary', () => fetchItinerary());
    loadOnce('journeyContent', fetchJourneyContent);
  }, [tab, userPermission.canEdit]);

  useEffect(() => {
    fetchUserPermission();
  }, []);

  // Auto-scroll to today's itinerary card (only once on first load)
  useEffect(() => {
    if (
      tab === TAB_IDS.ITINERARY &&
      itinerary.length > 0 &&
      !hasAutoScrolled
    ) {
      const today = new Date();
      const todayStr = `${today.getMonth() + 1}/${today.getDate()}`;
      const todayItem = itinerary.find((item) => item.date === todayStr);
      if (todayItem) {
        setHasAutoScrolled(true);
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          const el = document.getElementById(`day-${todayItem.day}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [itinerary.length, tab, hasAutoScrolled]);

  const cityList = useMemo(() => {
    const cities: string[] = [];
    const seen = new Set<string>();
    itinerary.forEach((item) => {
      if (item.city) {
        const shortName = item.city.trim().split(' ')[0];
        if (shortName && !seen.has(shortName)) {
          cities.push(shortName);
          seen.add(shortName);
        }
      }
    });
    return cities;
  }, [itinerary]);

  const ticketsByDay = useMemo(() => {
    return tickets.reduce<Record<string, TicketItem[]>>((result, ticket) => {
      if (!result[ticket.day]) result[ticket.day] = [];
      result[ticket.day].push(ticket);
      return result;
    }, {});
  }, [tickets]);

  const scrollToCity = (shortName: string) => {
    const targetItem = itinerary.find((i) => {
      const currentShort = i.city ? i.city.trim().split(' ')[0] : '';
      return currentShort === shortName;
    });
    if (targetItem) {
      const el = document.getElementById(`day-${targetItem.day}`);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openJourney = (city?: string) => {
    setJourneyNavigation((current) => ({
      city: city || null,
      request: current.request + 1,
    }));
    setShowMenu(false);
    setTab(TAB_IDS.JOURNEY);
  };

  const openDashboard = () => {
    setShowMenu(false);
    setTab(TAB_IDS.DASHBOARD);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPendingTodos = (rowNumber?: number) => {
    setTodoNavigation((current) => ({
      rowNumber: rowNumber ?? null,
      request: current.request + 1,
    }));
    setTab(TAB_IDS.TODO);
  };

  const handleItineraryUpdate = (updatedItem?: ItineraryFormData) => {
    if (updatedItem) {
      setItinerary((current) =>
        current.map((item) =>
          item.rowNumber === updatedItem.rowNumber
            ? {
                ...item,
                city: updatedItem.city,
                content: updatedItem.content,
                transport: updatedItem.transport,
                ticket: updatedItem.ticket,
                link: updatedItem.link,
              }
            : item
        )
      );
    }
    fetchItinerary(false);
  };

  return (
    <div className="app-shell min-h-screen bg-paper">
      {/* Header */}
      <header className="sticky top-0 z-50 liquid-shell-header border-b border-gold/25 backdrop-blur-sm">
        <div className="liquid-main-header relative flex min-h-14 items-center justify-between gap-2 px-2 py-2">
          <h1 className="min-w-0 flex-1">
            <button
              type="button"
              aria-label={`${tripConfig.tripName}，回到總覽`}
              aria-current={tab === TAB_IDS.DASHBOARD ? 'page' : undefined}
              onClick={openDashboard}
              className="flex h-10 min-w-0 items-center justify-start gap-1.5 sm:gap-2"
            >
              <img
                src="/vic-dora-mark.svg"
                alt=""
                className="h-6 w-6 shrink-0 min-[360px]:h-8 min-[360px]:w-8 sm:h-9 sm:w-9"
              />
              <span className="min-w-0 text-left leading-none">
                <span className="block whitespace-nowrap font-display text-[10px] font-semibold tracking-[-0.01em] text-ink min-[360px]:text-xs sm:text-sm">
                  Vic &amp; Dora
                </span>
                <span className="mt-1 block whitespace-nowrap text-[7px] font-semibold uppercase tracking-[0.12em] text-gold/90 min-[360px]:text-[8px] sm:text-[9px]">
                  {tripConfig.tripSubtitle}
                </span>
              </span>
            </button>
          </h1>

          <div className="flex shrink-0 items-center gap-1">
            {/* Trip Secretary shortcut */}
            {userPermission.canEdit && (
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                aria-label="開啟旅程秘書"
                title="AI 旅程秘書"
                className="flex h-10 w-10 items-center justify-center rounded-full text-ink/80 [filter:drop-shadow(0_1px_1px_rgba(253,251,247,0.9))] transition-colors hover:bg-white/45 hover:text-deep-blue"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
                </svg>
              </button>
            )}

            {/* Journey shortcut */}
            <button
              type="button"
              aria-label="開啟旅程故事"
              aria-current={tab === TAB_IDS.JOURNEY ? 'page' : undefined}
              title="旅程故事"
              onClick={() => openJourney()}
              className={`z-50 flex h-10 w-10 items-center justify-center rounded-full text-ink/80 [filter:drop-shadow(0_1px_1px_rgba(253,251,247,0.9))] transition-colors hover:bg-white/45 hover:text-ink ${
                tab === TAB_IDS.JOURNEY ? 'bg-white/55 text-deep-blue' : ''
              }`}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 19.5V5.75A2.75 2.75 0 0 1 6.75 3H20v15H6.75A2.75 2.75 0 0 0 4 20.75" />
                <path d="M8 7h8M8 11h6" />
              </svg>
            </button>

            {/* Useful links shortcut */}
            <button
              type="button"
              aria-label="開啟實用連結"
              aria-current={tab === TAB_IDS.LINKS ? 'page' : undefined}
              title="實用連結"
              onClick={() => {
                setShowMenu(false);
                setTab(TAB_IDS.LINKS);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`z-50 flex h-10 w-10 items-center justify-center rounded-full text-ink/80 [filter:drop-shadow(0_1px_1px_rgba(253,251,247,0.9))] transition-colors hover:bg-white/45 hover:text-ink ${
                tab === TAB_IDS.LINKS ? 'bg-white/55 text-deep-blue' : ''
              }`}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10.5 13.5 13.5 10.5" />
                <path d="M7.05 15.95 5.64 17.36a3.5 3.5 0 0 0 4.95 4.95L14 18.9a3.5 3.5 0 0 0 0-4.95" />
                <path d="m16.95 8.05 1.41-1.41a3.5 3.5 0 0 0-4.95-4.95L10 5.1a3.5 3.5 0 0 0 0 4.95" />
              </svg>
            </button>

            {/* Menu button */}
            <button
              type="button"
              aria-label="開啟選單"
              aria-expanded={showMenu}
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink/80 [filter:drop-shadow(0_1px_1px_rgba(253,251,247,0.9))] transition-colors hover:bg-white/45 hover:text-ink"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

          {/* Dropdown menu */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-3 top-full mt-1 z-50 bg-white/95 backdrop-blur-sm border border-gold/20 rounded shadow-xl py-1.5 min-w-[180px]">
                {userPermission.privateLinks?.googleSheet && (
                  <a
                    href={userPermission.privateLinks.googleSheet}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-serif text-ink hover:bg-gold/10 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <svg className="w-4 h-4 text-deep-blue" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
                    </svg>
                    Google Sheet
                  </a>
                )}
                <a
                  href={tripConfig.links.googleMap}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-serif text-ink hover:bg-gold/10 transition-colors"
                  onClick={() => setShowMenu(false)}
                >
                  <svg className="w-4 h-4 text-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  Google Map
                </a>
                {userPermission.privateLinks?.ticketFolder && (
                  <a
                    href={userPermission.privateLinks.ticketFolder}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-serif text-ink hover:bg-gold/10 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <svg className="w-4 h-4 text-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                    </svg>
                    Tickets
                  </a>
                )}
                <div className="mx-3 my-1 h-px bg-gold/10" />
                <a
                  href={tripConfig.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-serif text-ink hover:bg-gold/10 transition-colors"
                  onClick={() => setShowMenu(false)}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  GitHub
                </a>
                <div className="mx-3 my-1 h-px bg-gold/10" />
                <AuthButton
                  permission={userPermission}
                  onChange={handlePermissionChange}
                />
              </div>
            </>
          )}
        </div>

        {/* Navigation bar */}
        {tab === TAB_IDS.ITINERARY && cityList.length > 0 && (
          <div className="liquid-subnav overflow-x-auto no-scrollbar py-1.5 px-4">
            <div className="flex gap-2 whitespace-nowrap min-w-max px-2">
              <span className="font-display text-xs self-center text-gold mr-1">
                JUMP TO:
              </span>
              {cityList.map((cityShortName) => (
                <button
                  key={cityShortName}
                  onClick={() => scrollToCity(cityShortName)}
                  className="px-3 py-1 rounded-full border border-gold text-ink text-xs font-serif hover:bg-gold hover:text-white transition-colors"
                >
                  {cityShortName}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className={tab === TAB_IDS.JOURNEY ? '' : tab === TAB_IDS.DASHBOARD || tab === TAB_IDS.TICKETS || tab === TAB_IDS.LINKS ? 'mt-2' : 'max-w-6xl mx-auto p-4 mt-2'}>
        {tab === TAB_IDS.DASHBOARD && (
          loadingItin ? <Loading /> : (
            <TripDashboard
              itinerary={itinerary}
              itineraryError={itineraryError}
              journeyContent={journeyContent}
              tickets={tickets}
              todos={todos}
              todosLoading={loadingTodos}
              todosError={todosError}
              referenceLinks={referenceLinks}
              referenceLinksLoading={loadingReferenceLinks}
              referenceLinksError={referenceLinksError}
              canViewTickets={userPermission.canEdit}
              onOpenItinerary={() => setTab(TAB_IDS.ITINERARY)}
              onOpenJourney={openJourney}
              onOpenTickets={() => setTab(TAB_IDS.TICKETS)}
              onOpenTodo={openPendingTodos}
              onOpenLinks={() => setTab(TAB_IDS.LINKS)}
            />
          )
        )}
        {tab === TAB_IDS.ITINERARY && (
          <div className="animate-fade-in-up">
            {loadingItin ? (
              <Loading />
            ) : itinerary.length === 0 ? (
              <div className="text-center mt-10 p-6 border border-dashed border-gray-300">
                <p className="text-gray-500 font-serif">暫無行程資料</p>
              </div>
            ) : (
              itinerary.map((item, idx) => (
                <ItineraryCard
                  key={idx}
                  item={item}
                  id={`day-${item.day}`}
                  onUpdate={handleItineraryUpdate}
                  navigationData={navigationData}
                  attractionDetails={attractionDetails}
                  foodRecommendations={foodRecommendations}
                  dayTickets={ticketsByDay[item.day] || []}
                  onFoodUpdate={fetchFoodRecommendations}
                  canEdit={userPermission.canEdit}
                />
              ))
            )}
          </div>
        )}
        {tab === TAB_IDS.TICKETS && (
          <TicketVaultPage tickets={tickets} canViewTickets={userPermission.canEdit} />
        )}
        {tab === TAB_IDS.LINKS && (
          <UsefulLinksPage
            links={referenceLinks}
            loading={loadingReferenceLinks}
            error={referenceLinksError}
            onBack={() => setTab(TAB_IDS.DASHBOARD)}
          />
        )}
        {visitedTabs.has(TAB_IDS.EXPENSE) && (
          <div
            className={tab === TAB_IDS.EXPENSE ? 'animate-fade-in-up' : 'hidden'}
            aria-hidden={tab !== TAB_IDS.EXPENSE}
          >
            <ExpensePage
              canEdit={userPermission.canEdit}
              isActive={tab === TAB_IDS.EXPENSE}
            />
          </div>
        )}
        {visitedTabs.has(TAB_IDS.TODO) && (
          <div
            className={tab === TAB_IDS.TODO ? 'animate-fade-in-up' : 'hidden'}
            aria-hidden={tab !== TAB_IDS.TODO}
          >
            <TodoPage
              canEdit={userPermission.canEdit}
              todos={todos}
              loading={loadingTodos}
              error={todosError}
              isActive={tab === TAB_IDS.TODO}
              navigation={todoNavigation}
              onTodosChange={setTodos}
            />
          </div>
        )}
        {tab === TAB_IDS.JOURNEY && (
          <div className="animate-fade-in-up w-full">
            {loadingItin ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <Loading />
              </div>
            ) : (
              <JourneyPage
                itinerary={itinerary}
                canEdit={userPermission.canEdit}
                journeyContent={journeyContent}
                navigation={journeyNavigation}
                onJourneyContentUpdate={setJourneyContent}
              />
            )}
          </div>
        )}
      </main>

      {/* Trip Secretary Modal */}
      {userPermission.canEdit && (
        <TripSecretaryModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* Floating liquid-glass tab navigation */}
      <nav
        className={`liquid-bottom-nav ${isBottomNavCompact ? 'is-compact' : ''}`}
        aria-label="主要導覽"
      >
        <div className="liquid-bottom-nav-items">
          {bottomTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-label={item.label}
              aria-current={tab === item.id ? 'page' : undefined}
              title={item.label}
              className={`liquid-bottom-nav-button ${
                tab === item.id
                  ? 'is-active'
                  : ''
              }`}
            >
              <TabIcon tab={item.id} />
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
