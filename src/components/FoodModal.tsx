import { useState, useEffect, useMemo } from 'react';
import { tripClient } from '@/utils/tripClient';
import { tokenizeLinkedText } from '@/utils/linkifyText';
import type { PriceLevel } from '@/types';

interface FoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayKey: string;
  city: string;
  itineraryContent: string;
  canEdit: boolean;
  savedData?: Partial<Record<PriceLevel, string>>;
  onFoodGenerated?: () => void;
}

const priceLevels: { value: PriceLevel; label: string; emoji: string }[] = [
  { value: 'budget', label: '平價', emoji: '💰' },
  { value: 'mid', label: '中價位', emoji: '💰💰' },
  { value: 'high', label: '高價位', emoji: '💰💰💰' },
];

export default function FoodModal({
  isOpen,
  onClose,
  dayKey,
  city,
  itineraryContent,
  canEdit,
  savedData,
  onFoodGenerated,
}: FoodModalProps) {
  const [selectedPrice, setSelectedPrice] = useState<PriceLevel>('mid');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if there's saved content for the selected price level
  const savedContent = savedData?.[selectedPrice];

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset generated content when modal closes or price changes
  useEffect(() => {
    if (!isOpen) {
      setGeneratedContent(null);
      setError(null);
    }
  }, [isOpen]);

  // Reset generated content when price level changes
  useEffect(() => {
    setGeneratedContent(null);
    setError(null);
  }, [selectedPrice]);

  // Determine what content to display
  const displayContent = generatedContent || savedContent;
  const hasContent = !!displayContent;

  const contentParts = useMemo(() => {
    if (!displayContent) return [];
    return tokenizeLinkedText(displayContent);
  }, [displayContent]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!canEdit) return;
    setIsGenerating(true);
    setError(null);

    try {
      const result = await tripClient.generateFoodRecommendations(
        dayKey,
        city,
        itineraryContent,
        selectedPrice
      );

      if (result.success && result.content) {
        setGeneratedContent(result.content);
        onFoodGenerated?.();
        if (result.persisted === false) {
          setError(result.message || '內容已生成，但尚未儲存');
        }
      } else {
        setError(result.message || '生成失敗，請稍後再試');
      }
    } catch (err) {
      setError('生成失敗，請稍後再試');
      console.error('AI food generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3"
      onClick={handleClose}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm"></div>

      {/* Modal content */}
      <div
        className="relative bg-paper border border-gold/60 shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gold/10 px-4 h-10 border-b border-gold flex items-center justify-between">
          <span className="font-display text-sm text-ink truncate pr-2">
            🍽️ {dayKey} · {city} 美食推薦
          </span>
          <button
            onClick={handleClose}
            className="-mr-1 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-ink transition-colors shrink-0"
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

        {/* Price level tabs */}
        <div className="flex border-b border-gold/30 bg-gold/5">
          {priceLevels.map((level) => (
            <button
              key={level.value}
              onClick={() => setSelectedPrice(level.value)}
              className={`flex-1 py-2 px-2 font-serif text-xs transition-all ${
                selectedPrice === level.value
                  ? 'bg-gold/20 text-gold border-b-2 border-gold font-bold'
                  : 'text-gray-500 hover:bg-gold/10'
              }`}
            >
              <span className="block text-xs mb-0.5">{level.emoji}</span>
              {level.label}
              {savedData?.[level.value] && (
                <span className="ml-1 text-xs text-deep-blue">✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="p-6 overflow-y-auto max-h-[45vh] custom-scrollbar">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-serif text-gray-500 text-sm">AI 正在搜尋美食中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="font-serif text-wax text-sm mb-4">{error}</p>
              <button
                onClick={handleGenerate}
                className="px-4 py-2 bg-gold text-white font-serif text-sm rounded-lg hover:bg-gold/90 transition-colors"
              >
                重試
              </button>
            </div>
          ) : hasContent ? (
            <div className="font-serif text-ink leading-loose text-[15px] whitespace-pre-line">
              {contentParts.map((part, index) =>
                part.kind === 'link' ? (
                  <a
                    key={`${part.value}-${index}`}
                    href={part.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold underline"
                  >
                    查看地圖
                  </a>
                ) : (
                  part.value
                )
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="font-serif text-gray-400 text-sm mb-4">
                尚無{priceLevels.find(l => l.value === selectedPrice)?.label}美食推薦
              </p>
              <button
                onClick={handleGenerate}
                disabled={!canEdit}
                className={`px-6 py-2.5 text-white font-display text-sm tracking-wider rounded-lg transition-all shadow-md ${
                  canEdit
                    ? 'bg-gradient-to-r from-gold to-gold/80 hover:from-gold/90 hover:to-gold/70'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                title={!canEdit ? '需編輯權限' : undefined}
              >
                🍽️ 生成美食推薦
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gold-light bg-gradient-to-t from-gold-light/20 to-transparent">
          <div className="flex gap-2">
            {hasContent && !isGenerating && (
              <button
                onClick={handleGenerate}
                disabled={!canEdit}
                className={`flex-1 py-2.5 border font-display text-sm tracking-wider transition-colors rounded-lg ${
                  canEdit
                    ? 'bg-gold/10 text-gold border-gold hover:bg-gold/20'
                    : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                }`}
                title={!canEdit ? '需編輯權限' : undefined}
              >
                ✨ 重新生成
              </button>
            )}
            <button
              onClick={handleClose}
              className={`${hasContent ? 'flex-1' : 'w-full'} py-2.5 bg-ink text-white font-display text-sm tracking-wider hover:bg-gray-800 transition-colors rounded-lg`}
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
