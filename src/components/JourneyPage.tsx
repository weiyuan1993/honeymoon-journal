import { useState, useMemo } from 'react';
import type { ItineraryItem, JourneyContent } from '@/types';
import { tripConfig } from '@/config/trip.config';
import { cityHeroImages, coverMobileImage } from '@/config/journey.images';
import { tripClient } from '@/utils/tripClient';

interface JourneyPageProps {
  itinerary: ItineraryItem[];
  canEdit: boolean;
  journeyContent: JourneyContent | null;
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

// City grouping (group these cities together)
const cityGroupMap: Record<string, string> = {
  '梵蒂岡': '羅馬',
};

// Extract main city name
function extractMainCity(cityStr: string): { zh: string; en: string } {
  // Handle separators: → ↔ /
  const cleanStr = cityStr.split(/[→↔/]/)[0].trim();
  // Remove any English text, numbers, and extra spaces
  const zhOnly = cleanStr.replace(/[a-zA-Z0-9]/g, '').replace(/\s+/g, '').trim();
  let cityName = zhOnly || cleanStr;

  // Apply grouping (e.g., 梵蒂岡 -> 羅馬)
  cityName = cityGroupMap[cityName] || cityName;

  return {
    zh: cityName,
    en: cityNameMap[cityName] || ''
  };
}

const getCitySectionId = (index: number) => `journey-city-${index}`;

export default function JourneyPage({ itinerary, canEdit, journeyContent, onJourneyContentUpdate }: JourneyPageProps) {
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

  const scrollToCitySection = (index: number) => {
    const target = document.getElementById(getCitySectionId(index));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="-mt-16 relative h-[80vh] md:h-[85vh] min-h-[450px] max-h-[700px] overflow-hidden">
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
            <p className="text-gold text-[10px] tracking-[0.3em] uppercase mb-2 drop-shadow-lg">
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
        const cityContent = journeyContent?.cities?.[segment.city];
        const heroImage = cityHeroImages[segment.city] || cityHeroImages['倫敦'];

        return (
          <section
            key={idx}
            id={getCitySectionId(idx)}
            className="scroll-target relative bg-paper"
          >
            {/* City Header */}
            <div className="max-w-5xl mx-auto px-4 md:px-8 pt-8 pb-4">
              <p className="text-gold text-[10px] tracking-[0.2em] uppercase mb-1">
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
                  <p className="text-[10px] text-gold uppercase tracking-wider mb-3 font-display">行程亮點</p>
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

          {/* Generate Button */}
          <div className="mt-8">
            <button
              onClick={handleGenerate}
              disabled={!canEdit || generating || itinerary.length === 0}
              className={`inline-flex items-center gap-2 px-6 py-3 font-display text-sm rounded-lg shadow-lg transition-all ${
                !canEdit
                  ? 'bg-gray-300 text-white cursor-not-allowed'
                  : journeyContent
                    ? 'bg-white border border-gold/30 text-gold hover:bg-gold/5'
                    : 'bg-gradient-to-r from-gold to-amber-500 text-white hover:shadow-xl'
              } disabled:opacity-50`}
              title={!canEdit ? '需編輯權限' : undefined}
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  AI 撰寫中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  {journeyContent ? '重新生成文案' : '✨ AI 生成旅程介紹'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
