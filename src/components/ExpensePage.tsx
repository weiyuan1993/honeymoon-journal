import { useState, useEffect, useMemo } from 'react';
import type { ExpenseItem as ExpenseItemType, ExpenseFormData } from '@/types';
import { tripConfig, getCurrencySymbol } from '@/config/trip.config';
import { gasClient } from '@/utils/gasClient';
import ExpenseItem from './ExpenseItem';
import Loading from './Loading';

interface ExpensePageProps {
  canEdit: boolean;
}

export default function ExpensePage({ canEdit }: ExpensePageProps) {
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

  const fetchList = async () => {
    setLoadingList(true);
    try {
      const data = await gasClient.getExpenseData();
      if (data && !('error' in data)) {
        setList(data);
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    }
    setLoadingList(false);
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await gasClient.saveExpense(formData);
      if (res.success) {
        setStatus('success');
        setFormData({ ...formData, item: '', amount: '' });
        fetchList();
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
    const oldList = [...list];
    setList(list.filter((item) => item.rowNumber !== rowNumber));
    try {
      const res = await gasClient.deleteExpense(rowNumber);
      if (!res.success) {
        alert(res.message);
        setList(oldList);
      } else {
        fetchList();
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
    <div className="space-y-6">
      {canEdit && (
        <div className="bg-white p-5 border-4 border-double border-subtle shadow-md">
          <h2 className="font-display text-lg text-center mb-4 text-ink border-b pb-2 border-gold">
            新增花費
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={formData.item}
              onChange={(e) =>
                setFormData({ ...formData, item: e.target.value })
              }
              className="w-full bg-paper border border-subtle p-3 font-serif rounded-sm"
              placeholder="項目"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="w-full bg-paper border border-subtle p-3 font-serif rounded-sm"
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
                className="w-full bg-paper border border-subtle p-3 font-serif rounded-sm"
              >
                {tripConfig.currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as ExpenseFormData['category'],
                })
              }
              className="w-full bg-paper border border-subtle p-3 font-serif rounded-sm"
            >
              {tripConfig.categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={status === 'submitting'}
              className={`w-full py-3 mt-2 font-display font-bold text-white transition-colors ${
                status === 'submitting' ? 'bg-gray-400' : 'bg-wax'
              } ${status === 'success' ? '!bg-forest' : ''}`}
            >
              {status === 'submitting'
                ? '...'
                : status === 'success'
                  ? '✔'
                  : '紀錄'}
            </button>
          </form>
        </div>
      )}

      {/* Statistics summary */}
      {list.length > 0 && (
        <div className="bg-white p-4 border border-subtle shadow-sm rounded-sm">
          <h3 className="font-display text-sm mb-3 text-ink border-b border-gold-light pb-2">
            統計摘要
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(stats.totals).map(([currency, total]) => (
              <div
                key={currency}
                className="bg-gray-50 p-2 rounded border border-gray-100"
              >
                <div className="text-xs text-gray-500 font-serif">
                  {getCurrencySymbol(currency)} 總計
                </div>
                <div className="font-display font-bold text-gold text-lg">
                  {getCurrencySymbol(currency)} {total.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and search */}
      {list.length > 0 && (
        <div className="bg-white p-4 border border-subtle shadow-sm rounded-sm space-y-3">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋項目..."
              className="w-full border border-subtle p-2 font-serif text-sm rounded-sm bg-paper"
            />
            <div className="flex gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-1 border border-subtle p-2 font-serif text-sm rounded-sm bg-paper"
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
                className="flex-1 border border-subtle p-2 font-serif text-sm rounded-sm bg-paper"
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
              className="text-xs text-gray-500 underline"
            >
              清除篩選
            </button>
          )}
        </div>
      )}

      {/* Expense list - grouped by date */}
      <div>
        <h2 className="font-display text-lg mb-4 pl-2 border-l-4 border-gold text-ink">
          花費記錄{' '}
          {stats.totalCount > 0 && (
            <span className="text-sm text-gray-500 font-normal">
              ({stats.totalCount})
            </span>
          )}
        </h2>
        {loadingList ? (
          <Loading />
        ) : stats.totalCount === 0 ? (
          <p className="text-center text-gray-400 py-4">無符合條件的紀錄</p>
        ) : (
          <div className="space-y-4">
            {displayDates.map((dateKey) => (
              <div
                key={dateKey}
                className="bg-white border border-subtle rounded-sm overflow-hidden"
              >
                <div className="bg-gray-50 px-4 py-2 border-b border-subtle">
                  <h3 className="font-display text-sm text-ink">{dateKey}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {groupedByDate[dateKey].map((item) => (
                    <ExpenseItem
                      key={item.rowNumber}
                      data={item}
                      onUpdate={fetchList}
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
