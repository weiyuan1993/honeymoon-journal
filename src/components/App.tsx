import { useState, useEffect, useMemo } from 'react';
import type {
  ItineraryItem,
  NavigationData,
  AttractionDetails,
  UserPermission,
} from '@/types';
import { gasClient } from '@/utils/gasClient';
import ItineraryCard from './ItineraryCard';
import ExpensePage from './ExpensePage';
import Loading from './Loading';

export default function App() {
  const [tab, setTab] = useState<'itinerary' | 'expense'>('itinerary');
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [loadingItin, setLoadingItin] = useState(false);
  const [navigationData, setNavigationData] = useState<NavigationData>({});
  const [attractionDetails, setAttractionDetails] = useState<AttractionDetails>(
    {}
  );
  const [userPermission, setUserPermission] = useState<UserPermission>({
    email: null,
    canEdit: false,
  });

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

  const fetchUserPermission = async () => {
    try {
      const data = await gasClient.getUserPermission();
      setUserPermission(data || { email: null, canEdit: false });
    } catch (error) {
      console.error('Failed to fetch user permission:', error);
    }
  };

  useEffect(() => {
    if (tab === 'itinerary' && itinerary.length === 0) {
      fetchItinerary();
    }
  }, [tab, itinerary.length]);

  useEffect(() => {
    fetchNavigationData();
    fetchAttractionDetails();
    fetchUserPermission();
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
      <header className="sticky top-0 z-50 bg-[#f4f0e6]/95 backdrop-blur-sm shadow-md py-1 border-b-0">
        <div className="text-center">
          <h1 className="font-display text-ink uppercase text-sm mb-0.5 tracking-wider">
            LY's Honeymoon Journal
          </h1>
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

      <main className="max-w-xl mx-auto p-4 mt-2">
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
      </main>

      {/* Bottom fixed tab navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gold shadow-lg">
        <div className="flex w-full">
          <button
            onClick={() => setTab('itinerary')}
            className={`flex-1 py-3 font-display text-sm tracking-wider transition-all duration-300 ${
              tab === 'itinerary'
                ? 'bg-ink text-white shadow-md'
                : 'bg-white text-gray-500 hover:text-ink hover:bg-gray-50'
            }`}
          >
            ITINERARY
          </button>
          <button
            onClick={() => setTab('expense')}
            className={`flex-1 py-3 font-display text-sm tracking-wider transition-all duration-300 border-l border-subtle ${
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
