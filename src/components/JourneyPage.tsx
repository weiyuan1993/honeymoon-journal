import { useEffect, useMemo, useState } from 'react';
import type { ItineraryItem, JourneyContent } from '@/types';
import { tripConfig } from '@/config/trip.config';
import { cityHeroImages, coverMobileImage } from '@/config/journey.images';
import { tripClient } from '@/utils/tripClient';
import {
  getJourneyCityContent,
  getPrimaryTripCity,
} from '@/utils/tripLocations';

interface JourneyPageProps {
  itinerary: ItineraryItem[];
  canEdit: boolean;
  journeyContent: JourneyContent | null;
  navigation: {
    city: string | null;
    request: number;
  };
  onJourneyContentUpdate: (content: JourneyContent) => void;
}

interface CitySegment {
  city: string;
  cityEn: string;
  startDay: number;
  endDay: number;
  days: ItineraryItem[];
  hotels: string[];
}

// City name mapping (Chinese -> English)
const cityNameMap: Record<string, string> = {
  '倫敦': 'London',
  '巴黎': 'Paris',
  '琉森': 'Lucerne',
  '因特拉肯': 'Interlaken',
  '策馬特': 'Zermatt',
  '米蘭': 'Milan',
  '威尼斯': 'Venice',
  '佛羅倫斯': 'Florence',
  '羅馬': 'Rome',
};

// Extract main city name
function extractMainCity(cityStr: string): { zh: string; en: string } {
  const cityName = getPrimaryTripCity(cityStr);

  return {
    zh: cityName,
    en: cityNameMap[cityName] || ''
  };
}

const getCitySectionId = (index: number) => `journey-city-${index}`;

const scrollToCitySection = (index: number) => {
  document
    .getElementById(getCitySectionId(index))
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export default function JourneyPage({
  itinerary,
  canEdit,
  journeyContent,
  navigation,
  onJourneyContentUpdate,
}: JourneyPageProps) {
  const [generating, setGenerating] = useState(false);

  // Group itinerary by city segments
  const citySegments = useMemo(() => {
    const segments: CitySegment[] = [];
    let currentSegment: CitySegment | null = null;

    itinerary.forEach((item) => {
      if (!item.city) return;

      const { zh, en } = extractMainCity(item.city);
      const dayNum = parseInt(item.day.replace('Day ', '')) || 0;

      // 如果是新城市，建立新區段
      const isNewCity = !currentSegment || currentSegment.city !== zh;

      if (isNewCity) {
        if (currentSegment) segments.push(currentSegment);
        currentSegment = {
          city: zh,
          cityEn: en,
          startDay: dayNum,
          endDay: dayNum,
          days: [item],
          hotels: [],
        };
      } else if (currentSegment) {
        currentSegment.endDay = dayNum;
        currentSegment.days.push(item);
      }

      if (item.hotel && currentSegment) {
        const hotelText = item.hotel.replace(/<[^>]*>/g, '').trim();
        if (hotelText && !currentSegment.hotels.includes(hotelText)) {
          currentSegment.hotels.push(hotelText);
        }
      }
    });

    if (currentSegment) segments.push(currentSegment);
    return segments;
  }, [itinerary]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!navigation.city) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const cityIndex = citySegments.findIndex(
        (segment) => segment.city === navigation.city
      );
      if (cityIndex >= 0) {
        scrollToCitySection(cityIndex);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [citySegments, navigation]);

  const handleGenerate = async () => {
    if (!canEdit) return;
    if (itinerary.length === 0) {
      alert('請先載入行程資料');
      return;
    }
    setGenerating(true);
    try {
      const result = await tripClient.generateJourneyIntro(itinerary);
      if (result.success && result.content) {
        onJourneyContentUpdate(result.content);
        if (result.persisted === false) {
          alert(result.message || '內容已生成，但尚未儲存');
        }
      } else {
        alert(result.message || '生成失敗');
      }
    } catch (error) {
      alert('生成失敗，請稍後再試');
    }
    setGenerating(false);
  };

  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="relative h-[80vh] md:h-[85vh] min-h-[450px] max-h-[700px] overflow-hidden">
        <picture>
          <source media="(max-width: 767px)" srcSet={coverMobileImage} />
          <img
            src={cityHeroImages['封面']}
            alt="Journey Hero"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="max-w-5xl mx-auto text-center px-4 [text-shadow:_0_2px_8px_rgba(0,0,0,0.8)]">
            <p className="text-gold text-xs tracking-[0.3em] uppercase mb-2 drop-shadow-lg">
              {tripConfig.tripSubtitle}
            </p>
            <h1 className="font-display text-2xl md:text-3xl mb-3 drop-shadow-lg">
              {tripConfig.tripName}
            </h1>
            <p className="text-white/90 text-sm font-serif mb-4">
              {itinerary.length} Days · {citySegments.length} Cities
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {citySegments.map((seg, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToCitySection(idx)}
                  className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs text-white/90 border border-white/20 transition-colors hover:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white/70"
                >
                  {seg.city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-paper px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-5xl justify-center">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canEdit || generating || itinerary.length === 0}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-display text-sm shadow-sm transition-all ${
              !canEdit
                ? 'cursor-not-allowed bg-gray-300 text-white'
                : 'border border-gold/30 bg-white text-gold hover:bg-gold/5 hover:shadow-md'
            } disabled:opacity-50`}
            title={!canEdit ? '需編輯權限' : undefined}
          >
            {generating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                AI 撰寫中...
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
                </svg>
                更新文案
              </>
            )}
          </button>
        </div>
      </div>

      {/* Intro Section */}
      <div className="bg-paper px-4 md:px-8 py-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-3 text-gold/60 mb-4">
            <span className="w-12 h-px bg-gold/40" />
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span className="w-12 h-px bg-gold/40" />
          </div>
          <p className="font-serif text-ink/80 text-base leading-loose italic">
            {journeyContent?.intro ||
              '一場穿越歐陸的浪漫蜜月之旅。從倫敦的皇家風範啟程，沉浸於巴黎的浪漫風情，翻越阿爾卑斯山的壯麗峰巒，最終在義大利的陽光下，寫下屬於我們的永恆篇章。'}
          </p>
        </div>
      </div>

      {/* City Sections */}
      {citySegments.map((segment, idx) => {
        const cityContent = getJourneyCityContent(
          journeyContent?.cities,
          segment.city
        );
        const heroImage = cityHeroImages[segment.city] || cityHeroImages['倫敦'];

        return (
          <section
            key={idx}
            id={getCitySectionId(idx)}
            className="scroll-target relative bg-paper"
          >
            {/* City Header */}
            <div className="max-w-5xl mx-auto px-4 md:px-8 pt-8 pb-4">
              <p className="text-gold text-xs tracking-[0.2em] uppercase mb-1">
                Day {segment.startDay}{segment.startDay !== segment.endDay ? ` — ${segment.endDay}` : ''}
              </p>
              <h2 className="text-ink font-display text-xl md:text-2xl">
                {segment.city}
                {segment.cityEn && <span className="text-ink/40 text-base ml-2 font-serif">{segment.cityEn}</span>}
              </h2>
            </div>

            {/* City Image - 保持圖片比例 */}
            <div className="max-w-5xl mx-auto px-4 md:px-8">
              <div className="relative rounded-xl overflow-hidden shadow-lg">
                <img
                  src={heroImage}
                  alt={segment.city}
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            {/* City Content */}
            <div className="bg-paper px-4 md:px-8 py-8">
              <div className="max-w-5xl mx-auto">
                {/* Description */}
                <div className="mb-6">
                  <p className="font-serif text-ink/80 text-[15px] leading-relaxed">
                    {cityContent || `在${segment.city}的${segment.endDay - segment.startDay + 1}天裡，我們將探索這座城市最迷人的風景，體驗當地獨特的文化氛圍，留下難忘的蜜月回憶。`}
                  </p>
                </div>

                {/* Highlights */}
                <div className="border-t border-gold/20 pt-4">
                  <p className="text-xs text-gold uppercase tracking-wider mb-3 font-display">行程亮點</p>
                  <div className="space-y-2">
                    {segment.days.map((day, dayIdx) => (
                      <div key={dayIdx} className="flex items-start gap-2">
                        <span className="text-gold text-xs mt-0.5 shrink-0">✦</span>
                        <span className="font-serif text-ink/70 text-sm leading-relaxed">
                          <span className="text-gold/80 font-medium mr-1">{day.day}</span>
                          {day.content.replace(/<[^>]*>/g, '')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hotel */}
                {segment.hotels.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-ink/50">
                    <span>🏨</span>
                    <span className="font-serif">{segment.hotels[0]}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            {idx < citySegments.length - 1 && (
              <div className="flex justify-center py-4 bg-paper">
                <div className="flex items-center gap-2 text-gold/30">
                  <span className="w-8 h-px bg-gold/30" />
                  <span className="text-lg">✈</span>
                  <span className="w-8 h-px bg-gold/30" />
                </div>
              </div>
            )}
          </section>
        );
      })}

      {/* Closing Section */}
      <div className="bg-gradient-to-b from-paper to-[#f0ebe0] px-4 md:px-8 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-8 py-6 border border-gold/30 rounded-lg bg-white/50">
            <div className="flex justify-center mb-4">
              <div className="flex items-center gap-2 text-gold/60">
                <span className="w-6 h-px bg-gold/40" />
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span className="w-6 h-px bg-gold/40" />
              </div>
            </div>
            <p className="font-serif text-ink/80 italic text-sm leading-relaxed">
              {journeyContent?.closing || '讓我們攜手踏上這段旅程，在歐洲的土地上，寫下屬於我們的永恆篇章。'}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
