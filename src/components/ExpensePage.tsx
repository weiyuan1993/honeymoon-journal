import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ExpenseItem as ExpenseItemType, ExpenseFormData } from '@/types';
import { tripConfig, getCurrencySymbol } from '@/config/trip.config';
import { gasClient } from '@/utils/gasClient';
import ExpenseItem from './ExpenseItem';
import InlineSpinner from './InlineSpinner';
import Loading from './Loading';

interface ExpensePageProps {
  canEdit: boolean;
  isActive: boolean;
}

export default function ExpensePage({ canEdit, isActive }: ExpensePageProps) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    item: '',
    amount: '',
    currency: tripConfig.defaultCurrency,
    category: tripConfig.categories[0].code,
  });
  const [list, setList] = useState<ExpenseItemType[]>([]);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>(
    'idle'
  );
  const [loadingList, setLoadingList] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const hasLoadedRef = useRef(false);

  const fetchList = useCallback(async (showLoading = !hasLoadedRef.current) => {
    if (showLoading) setLoadingList(true);
    try {
      const data = await gasClient.getExpenseData();
      if (data && !('error' in data)) {
        setList(data);
        hasLoadedRef.current = true;
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      if (showLoading) setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;
    fetchList(!hasLoadedRef.current);
  }, [fetchList, isActive]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setStatus('submitting');
    try {
      const res = await gasClient.saveExpense(formData);
      if (res.success) {
        setStatus('success');
        setFormData({ ...formData, item: '', amount: '' });
        fetchList(false);
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        alert(res.message);
        setStatus('idle');
      }
    } catch (error) {
      alert('記帳失敗');
      setStatus('idle');
    }
  };

  const handleItemDelete = async (rowNumber: number) => {
    if (!canEdit) return;
    const oldList = [...list];
    setList(list.filter((item) => item.rowNumber !== rowNumber));
    try {
      const res = await gasClient.deleteExpense(rowNumber);
      if (!res.success) {
        alert(res.message);
        setList(oldList);
      } else {
        fetchList(false);
      }
    } catch (error) {
      setList(oldList);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const filtered = list.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.item.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory =
        filterCategory === 'all' || item.category === filterCategory;
      const matchCurrency =
        filterCurrency === 'all' || item.currency === filterCurrency;
      return matchSearch && matchCategory && matchCurrency;
    });

    const totals: Record<string, number> = {};
    filtered.forEach((item) => {
      const key = item.currency;
      if (!totals[key]) totals[key] = 0;
      totals[key] += parseFloat(String(item.amount)) || 0;
    });

    return { filtered, totals, totalCount: filtered.length };
  }, [list, searchTerm, filterCategory, filterCurrency]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, ExpenseItemType[]> = {};
    stats.filtered.forEach((item) => {
      try {
        const d = new Date(item.timestamp);
        if (!isNaN(d.getTime())) {
          const dateKey = `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
          if (!groups[dateKey]) groups[dateKey] = [];
          groups[dateKey].push(item);
        } else {
          const dateKey = '其他';
          if (!groups[dateKey]) groups[dateKey] = [];
          groups[dateKey].push(item);
        }
      } catch {
        const dateKey = '其他';
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(item);
      }
    });
    return groups;
  }, [stats.filtered]);

  const dateKeys = Object.keys(groupedByDate).sort((a, b) => {
    if (a === '其他') return 1;
    if (b === '其他') return -1;
    return b.localeCompare(a);
  });

  const displayDates = showAll ? dateKeys : dateKeys.slice(0, 3);
  const hasMore = dateKeys.length > 3;

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/15 via-white to-gold/5 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold text-white shadow-sm">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7 3.5h10A1.5 1.5 0 0 1 18.5 5v16l-2.25-1.25L14 21l-2-1.25L10 21l-2.25-1.25L5.5 21V5A1.5 1.5 0 0 1 7 3.5Z" />
                <path d="M8.5 8h7" />
                <path d="M8.5 12h7" />
              </svg>
            </span>
            <h2 className="font-display text-sm text-ink/80">快速記帳</h2>
          </div>
          {status === 'success' && (
            <span className="rounded-full bg-forest/10 px-2 py-1 font-serif text-[11px] text-forest">
              已記錄
            </span>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-2.5">
          {!canEdit && (
            <p className="text-xs text-ink/50 font-serif">
              目前為瀏覽模式，可查看功能但無法編輯。
            </p>
          )}
          <input
            type="text"
            value={formData.item}
            onChange={(e) =>
              setFormData({ ...formData, item: e.target.value })
            }
            disabled={!canEdit}
            className="w-full bg-white/90 border border-gold/20 px-3 py-2.5 font-serif text-sm rounded-xl focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
            placeholder="項目名稱"
            required
          />
          <div className="grid grid-cols-5 gap-2">
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              disabled={!canEdit}
              className="col-span-3 bg-white/90 border border-gold/20 px-3 py-2.5 font-serif text-sm rounded-xl focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
              placeholder="金額"
              required
            />
            <select
              value={formData.currency}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  currency: e.target.value as ExpenseFormData['currency'],
                })
              }
              disabled={!canEdit}
              className="col-span-2 bg-white/90 border border-gold/20 px-2 py-2.5 font-serif text-sm rounded-xl focus:outline-none focus:border-gold transition-colors"
            >
              {tripConfig.currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as ExpenseFormData['category'],
                })
              }
              disabled={!canEdit}
              className="flex-1 bg-white/90 border border-gold/20 px-3 py-2.5 font-serif text-sm rounded-xl focus:outline-none focus:border-gold transition-colors"
            >
              {tripConfig.categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!canEdit || status === 'submitting'}
              className={`px-5 py-2.5 font-display text-sm text-white rounded-xl transition-all ${
                !canEdit || status === 'submitting'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-ink hover:bg-ink/90 shadow-sm'
              } ${status === 'success' ? '!bg-forest' : ''}`}
              title={!canEdit ? '需編輯權限' : undefined}
            >
              {status === 'submitting' ? (
                <InlineSpinner label="記錄中" />
              ) : status === 'success' ? (
                '✔'
              ) : (
                '記錄'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Expense list - grouped by date */}
      <div className="space-y-3">
        {list.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-sm text-ink/80">花費記錄</h2>
                <p className="mt-0.5 font-serif text-[11px] text-ink/45">
                  {stats.totalCount} 筆紀錄
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                {Object.entries(stats.totals).map(([currency, total]) => (
                  <div
                    key={currency}
                    className="rounded-lg bg-gold/10 px-2.5 py-1 text-right"
                  >
                    <div className="font-serif text-[10px] leading-none text-ink/45">
                      {getCurrencySymbol(currency)}
                    </div>
                    <div className="mt-0.5 font-display text-sm font-bold text-gold">
                      {total.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜尋項目..."
                  className="w-full bg-gray-50 border border-gray-200 pl-9 pr-3 py-2 font-serif text-sm rounded-lg focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2 font-serif text-sm rounded-lg focus:outline-none focus:border-gold transition-colors"
                >
                  <option value="all">所有類別</option>
                  {tripConfig.categories.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filterCurrency}
                  onChange={(e) => setFilterCurrency(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2 font-serif text-sm rounded-lg focus:outline-none focus:border-gold transition-colors"
                >
                  <option value="all">所有貨幣</option>
                  {tripConfig.currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(searchTerm ||
              filterCategory !== 'all' ||
              filterCurrency !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('all');
                  setFilterCurrency('all');
                }}
                className="text-xs text-gold hover:text-gold/70 transition-colors"
              >
                ✕ 清除篩選
              </button>
            )}
          </div>
        )}
        {loadingList && list.length === 0 ? (
          <Loading />
        ) : stats.totalCount === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-400 font-serif">
              {list.length === 0 ? '暫無花費紀錄' : '無符合條件的紀錄'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayDates.map((dateKey) => (
              <div
                key={dateKey}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <div className="bg-gradient-to-r from-gold/5 to-transparent px-3 py-1.5 border-b border-gold/10">
                  <h3 className="font-display text-xs text-ink/60">{dateKey}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {groupedByDate[dateKey].map((item) => (
                    <ExpenseItem
                      key={item.rowNumber}
                      data={item}
                      onUpdate={() => fetchList(false)}
                      onDelete={handleItemDelete}
                      canEdit={canEdit}
                    />
                  ))}
                </div>
              </div>
            ))}
            {hasMore && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full py-2 text-center text-sm text-gold hover:text-wax font-serif border border-gold rounded-sm transition-colors"
              >
                {showAll ? '收起' : `顯示更多 (${dateKeys.length - 3} 天)`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
