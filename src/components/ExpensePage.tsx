import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  ExpenseFormData,
  ExpenseItem as ExpenseItemType,
  ExpenseOverviewData,
} from '@/types';
import { tripConfig } from '@/config/trip.config';
import { tripClient } from '@/utils/tripClient';
import ExpenseHistory from './ExpenseHistory';
import type { ExpenseHistoryModel } from './ExpenseHistory';
import ExpenseOverview from './ExpenseOverview';
import ExpenseToday from './ExpenseToday';
import type { ExpenseTodayModel } from './ExpenseToday';
import {
  ALL_EXPENSE_FILTER,
  getLocalDateKey,
  selectTodayExpenses,
} from './expenseData';
import type { ExpenseFilters } from './expenseData';
import type { LoadStatus, SubmitStatus } from './expenseUi';

interface ExpensePageProps {
  canEdit: boolean;
  isActive: boolean;
}

type ExpenseTab = 'today' | 'overview' | 'details';

interface ExpenseTabDefinition {
  id: ExpenseTab;
  label: string;
}

const EXPENSE_TABS: ExpenseTabDefinition[] = [
  { id: 'today', label: '今日' },
  { id: 'overview', label: '總覽' },
  { id: 'details', label: '明細' },
];

export default function ExpensePage({ canEdit, isActive }: ExpensePageProps) {
  const [activeTab, setActiveTab] = useState<ExpenseTab>('today');
  const [formData, setFormData] = useState<ExpenseFormData>({
    item: '',
    amount: '',
    currency: tripConfig.defaultCurrency,
    category: tripConfig.categories[0].code,
  });
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [list, setList] = useState<ExpenseItemType[]>([]);
  const [ledgerStatus, setLedgerStatus] = useState<LoadStatus>('idle');
  const [ledgerWarning, setLedgerWarning] = useState<string | null>(null);
  const [overview, setOverview] = useState<ExpenseOverviewData | null>(null);
  const [overviewStatus, setOverviewStatus] = useState<LoadStatus>('idle');
  const [overviewWarning, setOverviewWarning] = useState<string | null>(null);
  const [todayKey, setTodayKey] = useState(() => getLocalDateKey(new Date()));
  const [filters, setFilters] = useState<ExpenseFilters>({
    searchTerm: '',
    category: ALL_EXPENSE_FILTER,
    currency: ALL_EXPENSE_FILTER,
  });
  const [showAll, setShowAll] = useState(false);

  const hasLoadedLedgerRef = useRef(false);
  const hasLoadedOverviewRef = useRef(false);
  const ledgerRequestRef = useRef(0);
  const overviewRequestRef = useRef(0);
  const successTimerRef = useRef<number | null>(null);

  const fetchLedger = useCallback(async (showBlockingLoading = false) => {
    const requestId = ++ledgerRequestRef.current;
    if (showBlockingLoading && !hasLoadedLedgerRef.current) {
      setLedgerStatus('loading');
    }
    try {
      const data = await tripClient.getExpenseData();
      if (requestId !== ledgerRequestRef.current) return;
      setList(data);
      setLedgerStatus('ready');
      setLedgerWarning(null);
      hasLoadedLedgerRef.current = true;
    } catch (error) {
      if (requestId !== ledgerRequestRef.current) return;
      console.error('Failed to fetch expenses:', error);
      if (hasLoadedLedgerRef.current) {
        setLedgerWarning('記帳資料重新整理失敗，目前顯示上次成功載入的內容。');
      } else {
        setLedgerStatus('error');
      }
    }
  }, []);

  const fetchOverview = useCallback(async (showBlockingLoading = false) => {
    const requestId = ++overviewRequestRef.current;
    if (showBlockingLoading && !hasLoadedOverviewRef.current) {
      setOverviewStatus('loading');
    }
    try {
      const data = await tripClient.getExpenseOverviewData();
      if (requestId !== overviewRequestRef.current) return;
      setOverview(data);
      setOverviewStatus('ready');
      setOverviewWarning(null);
      hasLoadedOverviewRef.current = true;
    } catch (error) {
      if (requestId !== overviewRequestRef.current) return;
      console.error('Failed to fetch expense overview:', error);
      if (hasLoadedOverviewRef.current) {
        setOverviewWarning('整體費用重新整理失敗，目前顯示上次成功載入的內容。');
      } else {
        setOverviewStatus('error');
      }
    }
  }, []);

  const refreshAll = useCallback(() => {
    void fetchLedger(false);
    void fetchOverview(false);
  }, [fetchLedger, fetchOverview]);

  const invalidatePendingReads = useCallback(() => {
    ledgerRequestRef.current += 1;
    overviewRequestRef.current += 1;
  }, []);

  useEffect(() => {
    if (!isActive) return;

    void fetchLedger(!hasLoadedLedgerRef.current);
    void fetchOverview(!hasLoadedOverviewRef.current);

    const handleFocus = refreshAll;
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchLedger, fetchOverview, isActive, refreshAll]);

  useEffect(() => {
    if (!isActive) return;

    const syncLocalDay = () => setTodayKey(getLocalDateKey(new Date()));
    syncLocalDay();
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );
    const timeoutId = window.setTimeout(
      syncLocalDay,
      Math.max(1_000, nextMidnight.getTime() - now.getTime() + 50)
    );
    window.addEventListener('focus', syncLocalDay);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('focus', syncLocalDay);
    };
  }, [isActive, todayKey]);

  useEffect(
    () => () => {
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
    },
    []
  );

  const todayItems = useMemo(
    () => selectTodayExpenses(list, new Date(`${todayKey}T12:00:00`)),
    [list, todayKey]
  );

  const todayModel: ExpenseTodayModel = {
    formData,
    submitStatus,
    todayKey,
    items: todayItems,
    ledgerStatus,
    ledgerWarning,
  };

  const historyModel: ExpenseHistoryModel = {
    list,
    status: ledgerStatus,
    warning: ledgerWarning,
    filters,
    showAll,
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    setSubmitStatus('submitting');
    try {
      const response = await tripClient.saveExpense(formData);
      if (!response.success) {
        alert(response.message);
        setSubmitStatus('idle');
        return;
      }
      invalidatePendingReads();
      setSubmitStatus('success');
      setFormData((current) => ({ ...current, item: '', amount: '' }));
      refreshAll();
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = window.setTimeout(
        () => setSubmitStatus('idle'),
        2_000
      );
    } catch {
      alert('記帳失敗');
      setSubmitStatus('idle');
    }
  };

  const handleItemDelete = async (rowNumber: number) => {
    if (!canEdit) return;
    const oldList = list;
    const target = oldList.find((item) => item.rowNumber === rowNumber);
    invalidatePendingReads();
    setList((current) =>
      current.filter((item) => item.rowNumber !== rowNumber)
    );
    try {
      const response = await tripClient.deleteExpense(
        rowNumber,
        target
          ? { timestamp: target.timestamp, item: target.item }
          : undefined
      );
      if (!response.success) {
        alert(response.message);
        setList(oldList);
        return;
      }
      refreshAll();
    } catch {
      setList(oldList);
    }
  };

  const handleItemUpdate = (updatedItem?: ExpenseItemType) => {
    if (updatedItem) {
      setList((current) =>
        current.map((item) =>
          item.rowNumber === updatedItem.rowNumber ? updatedItem : item
        )
      );
    }
    invalidatePendingReads();
    refreshAll();
  };

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="花費檢視"
        className="grid grid-cols-3 rounded-2xl border border-gold/20 bg-white p-1 shadow-sm"
      >
        {EXPENSE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`expense-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`expense-panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-3 py-2 font-display text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-ink text-white shadow-sm'
                : 'text-ink/50 hover:bg-gold/5 hover:text-ink/75'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`expense-panel-${activeTab}`}
        aria-labelledby={`expense-tab-${activeTab}`}
      >
        {activeTab === 'today' ? (
          <ExpenseToday
            canEdit={canEdit}
            model={todayModel}
            onFormChange={(patch) =>
              setFormData((current) => ({ ...current, ...patch }))
            }
            onSubmit={handleSubmit}
            onItemUpdate={handleItemUpdate}
            onItemDelete={handleItemDelete}
          />
        ) : activeTab === 'overview' ? (
          <ExpenseOverview
            overview={overview}
            status={overviewStatus}
            refreshWarning={overviewWarning}
          />
        ) : (
          <ExpenseHistory
            canEdit={canEdit}
            model={historyModel}
            onFiltersChange={(patch) =>
              setFilters((current) => ({ ...current, ...patch }))
            }
            onToggleShowAll={() => setShowAll((current) => !current)}
            onItemUpdate={handleItemUpdate}
            onItemDelete={handleItemDelete}
          />
        )}
      </div>
    </div>
  );
}
