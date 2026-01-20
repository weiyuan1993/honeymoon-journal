import { useState, useEffect, useMemo } from 'react';
import type {
  ItineraryItem,
  NavigationData,
  AttractionDetails,
  FoodRecommendations,
  UserPermission,
  JourneyContent,
} from '@/types';
import { tripConfig } from '@/config/trip.config';
import { gasClient } from '@/utils/gasClient';
import ItineraryCard from './ItineraryCard';
import ExpensePage from './ExpensePage';
import JourneyPage from './JourneyPage';
import Loading from './Loading';

type TabType = 'itinerary' | 'expense' | 'journey';

const getInitialTab = (): TabType => {
  // Try URL hash first (for local dev)
  const hash = window.location.hash.replace('#', '');
  if (hash === 'itinerary' || hash === 'expense' || hash === 'journey') {
    return hash;
  }
  // Then try localStorage (for GAS)
  try {
    const saved = localStorage.getItem('activeTab');
    if (saved === 'itinerary' || saved === 'expense' || saved === 'journey') {
      return saved;
    }
  } catch {
    // localStorage not available
  }
  return 'journey'; // default tab
};

export default function App() {
  const [tab, setTab] = useState<TabType>(getInitialTab);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [loadingItin, setLoadingItin] = useState(false);
  const [navigationData, setNavigationData] = useState<NavigationData>({});
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
  const [isScrolled, setIsScrolled] = useState(false);
  const [journeyContent, setJourneyContent] = useState<JourneyContent | null>(null);
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);

  // Sync tab with URL hash and localStorage
  useEffect(() => {
    // Save to localStorage (works in GAS)
    try {
      localStorage.setItem('activeTab', tab);
    } catch {
      // localStorage not available
    }
    // Also update hash (works in local dev)
    if (window.location.hash !== `#${tab}`) {
      window.location.hash = tab;
    }
  }, [tab]);

  // Listen for browser back/forward (local dev only)
  useEffect(() => {
    const handleHashChange = () => {
      setTab(getInitialTab());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchItinerary = async () => {
    setLoadingItin(true);
    try {
      const data = await gasClient.getItineraryData();
      setItinerary(data);
    } catch (error) {
      console.error('Failed to fetch itinerary:', error);
    }
    setLoadingItin(false);
  };

  const fetchNavigationData = async () => {
    try {
      const data = await gasClient.getNavigationData();
      setNavigationData(data || {});
    } catch (error) {
      console.error('Failed to fetch navigation data:', error);
    }
  };

  const fetchAttractionDetails = async () => {
    try {
      const data = await gasClient.getAttractionDetails();
      setAttractionDetails(data || {});
    } catch (error) {
      console.error('Failed to fetch attraction details:', error);
    }
  };

  const fetchFoodRecommendations = async () => {
    try {
      const data = await gasClient.getFoodRecommendations();
      setFoodRecommendations(data || {});
    } catch (error) {
      console.error('Failed to fetch food recommendations:', error);
    }
  };

  const fetchUserPermission = async () => {
    try {
      const data = await gasClient.getUserPermission();
      setUserPermission(data || { email: null, canEdit: false });
    } catch (error) {
      console.error('Failed to fetch user permission:', error);
    }
  };

  const fetchJourneyContent = async () => {
    try {
      const data = await gasClient.getJourneyContent();
      if (data && data.intro) setJourneyContent(data);
    } catch (error) {
      console.error('Failed to fetch journey content:', error);
    }
  };

  useEffect(() => {
    // Journey page also needs itinerary data for city segments
    if ((tab === 'itinerary' || tab === 'journey') && itinerary.length === 0) {
      fetchItinerary();
    }
  }, [tab, itinerary.length]);

  // Auto-scroll to today's itinerary card (only once on first load)
  useEffect(() => {
    if (tab === 'itinerary' && itinerary.length > 0 && !hasAutoScrolled) {
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

  useEffect(() => {
    fetchNavigationData();
    fetchAttractionDetails();
    fetchFoodRecommendations();
    fetchUserPermission();
    fetchJourneyContent();
  }, []);

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

  return (
    <div className="min-h-screen pb-20 bg-paper">
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-sm border-b border-gold/20 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 shadow-sm'
          : 'bg-gradient-to-b from-[#f8f5ed] via-[#f4f0e6] to-[#f0ebe0] shadow-md'
      }`}>
        <div className={`relative flex flex-col items-center justify-center px-4 transition-all duration-300 ${
          isScrolled ? 'py-1.5' : 'py-2'
        }`}>
          {/* Subtitle - hidden when scrolled */}
          <div className={`flex items-center gap-1.5 text-gold/80 text-[9px] tracking-[0.25em] uppercase transition-all duration-300 ${
            isScrolled ? 'h-0 opacity-0 overflow-hidden' : 'h-auto opacity-100 mb-0'
          }`}>
            <span className="w-3 h-px bg-gold/40" />
            <span>{tripConfig.tripSubtitle}</span>
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span className="w-3 h-px bg-gold/40" />
          </div>

          {/* Main title */}
          <h1
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`font-display text-ink tracking-wide cursor-pointer hover:text-gold transition-all duration-300 ${
              isScrolled ? 'text-xs' : 'text-sm'
            }`}
          >
            {tripConfig.tripName}
          </h1>

          {/* Menu button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gold/70 hover:text-gold transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-3 top-full mt-1 z-50 bg-white/95 backdrop-blur-sm border border-gold/20 rounded shadow-xl py-1.5 min-w-[180px]">
                <a
                  href={tripConfig.links.googleSheet}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-serif text-ink hover:bg-gold/10 transition-colors"
                  onClick={() => setShowMenu(false)}
                >
                  <svg className="w-4 h-4 text-forest" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
                  </svg>
                  Google Sheet
                </a>
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
              </div>
            </>
          )}
        </div>

        {/* Navigation bar */}
        {tab === 'itinerary' && cityList.length > 0 && (
          <div className="bg-white border-t border-subtle overflow-x-auto no-scrollbar py-1.5 px-4 shadow-inner mt-0.5">
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

      <main className={tab === 'journey' ? 'mt-2' : 'max-w-xl mx-auto p-4 mt-2'}>
        {tab === 'itinerary' && (
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
                  onUpdate={fetchItinerary}
                  navigationData={navigationData}
                  attractionDetails={attractionDetails}
                  foodRecommendations={foodRecommendations}
                  onFoodUpdate={fetchFoodRecommendations}
                  canEdit={userPermission.canEdit}
                />
              ))
            )}
          </div>
        )}
        {tab === 'expense' && (
          <div className="animate-fade-in-up">
            <ExpensePage canEdit={userPermission.canEdit} />
          </div>
        )}
        {tab === 'journey' && (
          <div className="animate-fade-in-up w-full">
            <JourneyPage
              itinerary={itinerary}
              canEdit={userPermission.canEdit}
              journeyContent={journeyContent}
              onJourneyContentUpdate={setJourneyContent}
            />
          </div>
        )}
      </main>

      {/* Bottom fixed tab navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gold shadow-lg">
        <div className="flex w-full">
          <button
            onClick={() => setTab('journey')}
            className={`flex-1 py-3 font-display text-xs tracking-wider transition-all duration-300 ${
              tab === 'journey'
                ? 'bg-ink text-white shadow-md'
                : 'bg-white text-gray-500 hover:text-ink hover:bg-gray-50'
            }`}
          >
            JOURNEY
          </button>
          <button
            onClick={() => setTab('itinerary')}
            className={`flex-1 py-3 font-display text-xs tracking-wider transition-all duration-300 border-l border-subtle ${
              tab === 'itinerary'
                ? 'bg-ink text-white shadow-md'
                : 'bg-white text-gray-500 hover:text-ink hover:bg-gray-50'
            }`}
          >
            ITINERARY
          </button>
          <button
            onClick={() => setTab('expense')}
            className={`flex-1 py-3 font-display text-xs tracking-wider transition-all duration-300 border-l border-subtle ${
              tab === 'expense'
                ? 'bg-ink text-white shadow-md'
                : 'bg-white text-gray-500 hover:text-ink hover:bg-gray-50'
            }`}
          >
            EXPENSES
          </button>
        </div>
      </div>
    </div>
  );
}
