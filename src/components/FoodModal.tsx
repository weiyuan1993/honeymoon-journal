import { useState, useEffect, useMemo, useRef } from 'react';
import { tripClient } from '@/utils/tripClient';
import { tokenizeLinkedText } from '@/utils/linkifyText';
import type { FoodRecommendation } from '@/types';

interface FoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayKey: string;
  city: string;
  itineraryContent: string;
  canEdit: boolean;
  savedData?: FoodRecommendation;
  onFoodGenerated?: () => void;
}

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
  const [preferences, setPreferences] = useState('');
  const requestId = useRef(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const savedContent = savedData?.content;

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    requestId.current += 1;
    setGeneratedContent(null);
    setError(null);
    setPreferences('');
    setIsGenerating(false);
    return () => { requestId.current += 1; };
  }, [isOpen, dayKey]);

  // Determine what content to display
  const displayContent = generatedContent || savedContent;
  const hasContent = !!displayContent;

  const contentParts = useMemo(() => {
    if (!displayContent) return [];
    return tokenizeLinkedText(displayContent);
  }, [displayContent]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!canEdit || isGenerating) return;
    const currentRequest = ++requestId.current;
    setIsGenerating(true);
    setError(null);

    try {
      const result = await tripClient.generateFoodRecommendations(
        dayKey,
        city,
        itineraryContent,
        preferences.trim() || undefined
      );

      if (result.success && result.persisted !== false) onFoodGenerated?.();
      if (currentRequest !== requestId.current) return;
      if (result.success && result.content) {
        setGeneratedContent(result.content);
        if (result.persisted === false) {
          setError(result.message || '內容已生成，但尚未儲存');
        }
      } else {
        setError(result.message || '生成失敗，請稍後再試');
      }
    } catch (err) {
      if (currentRequest === requestId.current) setError('生成失敗，請稍後再試');
      console.error('AI food generation error:', err);
    } finally {
      if (currentRequest === requestId.current) setIsGenerating(false);
    }
  };

  const handleClose = () => {
    requestId.current += 1;
    onClose();
  };

  return (
    <div
      className="trip-modal-overlay"
      onClick={handleClose}
    >
      {/* Background overlay */}
      <div className="trip-modal-backdrop"></div>

      {/* Modal content */}
      <div
        className="trip-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="trip-modal-header">
          <span className="trip-modal-title">
            {dayKey} · {city} · 美食推薦
          </span>
          <button
            onClick={handleClose}
            className="trip-modal-close"
            aria-label="關閉視窗"
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

        {/* Content area */}
        <div className="trip-modal-body custom-scrollbar">
          {error && <p role="alert" className="mb-4 text-sm text-wax">{error}</p>}
          {hasContent ? (
            <div className="trip-modal-copy whitespace-pre-line">
              {contentParts.map((part, index) =>
                part.kind === 'link' ? (
                  <a
                    key={`${part.value}-${index}`}
                    href={part.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="food-link-button whitespace-nowrap"
                  >
                    {part.value.includes('google.com/maps') || part.value.includes('maps.google.com') ? '查看地圖' : '查看來源'}
                  </a>
                ) : (
                  !part.value.trim() &&
                  contentParts[index - 1]?.kind === 'link' &&
                  contentParts[index + 1]?.kind === 'link'
                    ? ' '
                    : part.value
                )
              )}
            </div>
          ) : (
            <p className="text-center py-8 text-sm text-gray-500">
              尚無當日推薦，可依行程產生早餐、午餐與晚餐建議。
            </p>
          )}
        </div>

        {canEdit && (
          <div className="trip-modal-footer">
            <details className="food-preferences-options">
              <summary>調整用餐需求（選填）</summary>
            <label className="food-preferences">
              <span>用餐需求 <small>選填</small></span>
              <textarea
                value={preferences}
                onChange={(event) => setPreferences(event.target.value)}
                placeholder="例如：今晚想吃亞洲菜，每人 €25 內"
                maxLength={500}
                rows={2}
                disabled={isGenerating}
              />
            </label>
            </details>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className={hasContent ? 'trip-modal-secondary w-full' : 'trip-modal-primary w-full'}
            >
              {isGenerating ? '正在查詢與整理推薦…' : hasContent ? '更新推薦' : '產生當日推薦'}
            </button>
            <p className="food-update-note" role="status">
              {isGenerating ? '完成後會儲存推薦，請稍候。' : '依行程查詢並儲存推薦；出發前請再確認營業與訂位。'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
