import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@/types';
import { gasClient } from '@/utils/gasClient';

interface TripSecretaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WELCOME_MESSAGE = '你好！我是你的旅程秘書，很高興能陪伴你規劃這趟蜜月之旅。你可以問我任何關於行程的問題，例如某天的安排、交通方式、住宿資訊，或是需要什麼建議都可以告訴我！';

const QUICK_SUGGESTIONS = [
  '今天的行程是什麼？',
  '我們在巴黎住哪裡？',
  '整趟旅程有幾天？',
  '倫敦有什麼必看景點？',
];

export default function TripSecretaryModal({ isOpen, onClose }: TripSecretaryModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: WELCOME_MESSAGE },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [useSearch, setUseSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load persisted chat history whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const history = await gasClient.getChatHistory();
        if (cancelled) return;

        if (history.length === 0) {
          setMessages([{ role: 'assistant', content: WELCOME_MESSAGE }]);
          return;
        }

        const restoredMessages = history.flatMap((item): ChatMessage[] => [
          {
            role: 'user',
            content: item.question,
            timestamp: item.timestamp,
          },
          {
            role: 'assistant',
            content: item.answer,
            timestamp: item.timestamp,
          },
        ]);
        setMessages(restoredMessages);
      } catch (error) {
        console.error('Load chat history error:', error);
        if (!cancelled) {
          setMessages([{ role: 'assistant', content: WELCOME_MESSAGE }]);
        }
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Focus input after history finishes loading
  useEffect(() => {
    if (isOpen && !isLoadingHistory) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isLoadingHistory]);

  const handleSend = async (questionOverride?: string) => {
    const question = (questionOverride ?? inputValue).trim();
    if (!question || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build history for context (exclude welcome message)
      const history = messages.slice(1).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await gasClient.chatWithSecretary(question, history, useSearch);

      if (response.success && response.answer) {
        const assistantMessage: ChatMessage = { role: 'assistant', content: response.answer };
        setMessages(prev => [
          ...prev,
          assistantMessage,
          ...(response.persisted === false
            ? [{ role: 'assistant' as const, content: response.message || '回答尚未儲存' }]
            : []),
        ]);
      } else {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: response.message || '抱歉，發生了一些問題，請稍後再試。',
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '抱歉，連線發生問題，請稍後再試。',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickSuggestion = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleClearHistory = async () => {
    try {
      const res = await gasClient.clearChatHistory();
      if (res.success) {
        setMessages([{ role: 'assistant', content: WELCOME_MESSAGE }]);
      } else {
        alert(res.message);
      }
    } catch (error) {
      console.error('Clear history error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-3">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg h-[min(85dvh,720px)] max-h-[calc(100dvh-1.5rem)] bg-paper rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gold/20 bg-gradient-to-r from-[#f8f5ed] to-[#f4f0e6]">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #c5a059, #d4b677)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                className="w-4 h-4"
              >
                <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="font-display text-ink text-sm tracking-wide">旅程秘書</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearHistory}
              className="p-2 text-gray-400 hover:text-gold transition-colors"
              title="清除對話"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-ink transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {isLoadingHistory ? (
            <div className="flex h-full items-center justify-center text-gold animate-pulse font-display text-xs tracking-wide">
              載入對話中...
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} ${
                  message.role === 'user' ? 'animate-message-right' : 'animate-message-left'
                }`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-3xl shadow-sm ${
                    message.role === 'user'
                      ? 'bg-gold text-white rounded-br-xl'
                      : 'bg-white border border-subtle text-ink rounded-bl-xl'
                  }`}
                >
                  <p className="text-sm font-serif leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </div>
            ))
          )}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start animate-message-left">
              <div className="bg-white border border-subtle px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gold rounded-full typing-dot" />
                  <span className="w-2 h-2 bg-gold rounded-full typing-dot" />
                  <span className="w-2 h-2 bg-gold rounded-full typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick suggestions */}
        {messages.length <= 2 && !isLoading && !isLoadingHistory && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSuggestion(suggestion)}
                  className="px-3 py-1.5 text-xs font-serif text-gold border border-gold/40 rounded-full hover:bg-gold/10 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="p-4 border-t border-subtle bg-white">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="請問有什麼可以幫助您的？"
              className="min-w-0 flex-1 px-4 py-2 bg-gray-50 border border-subtle rounded-full text-[16px] leading-6 font-serif text-ink placeholder:text-gray-400 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30"
              disabled={isLoading || isLoadingHistory}
            />
            <button
              type="button"
              onClick={() => setUseSearch(prev => !prev)}
              disabled={isLoading || isLoadingHistory}
              aria-label={useSearch ? '關閉網路搜尋' : '啟用網路搜尋'}
              aria-pressed={useSearch}
              title={useSearch ? '搜尋模式已啟用' : '啟用網路搜尋'}
              className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-full border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                useSearch
                  ? 'border-gold bg-gold/15 text-gold shadow-sm ring-2 ring-gold/20'
                  : 'border-subtle bg-gray-50 text-gray-400 hover:border-gold/50 hover:text-gold'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.7}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M11.5 3a13.4 13.4 0 000 18M12.5 3a13.4 13.4 0 010 18" />
              </svg>
            </button>
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading || isLoadingHistory}
              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: inputValue.trim() && !isLoading && !isLoadingHistory
                  ? 'linear-gradient(135deg, #c5a059, #d4b677)'
                  : '#e5e5e5',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={inputValue.trim() && !isLoading && !isLoadingHistory ? 'white' : '#9ca3af'}
                className="w-5 h-5"
              >
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
