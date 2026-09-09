import type { ExpenseOverviewData } from '@/types';
import { getCurrencySymbol } from '@/config/trip.config';
import Loading from './Loading';
import { getExpenseOverviewDisplayMode } from './expenseData';
import {
  expenseAmountFormatter,
  ExpenseWarning,
  type LoadStatus,
} from './expenseUi';

interface ExpenseOverviewProps {
  overview: ExpenseOverviewData | null;
  status: LoadStatus;
  refreshWarning: string | null;
}

const twdFormatter = new Intl.NumberFormat('zh-TW', {
  maximumFractionDigits: 0,
});

const exchangeRateFormatter = new Intl.NumberFormat('zh-TW', {
  maximumFractionDigits: 5,
});

const exchangeRateCurrencies = ['CHF', 'EUR', 'GBP'] as const;

const formatTwd = (amount: number | null, approximate = false): string => {
  if (amount === null || !Number.isFinite(amount)) return '暫無法換算';
  return `${approximate ? '約 ' : ''}NT$${twdFormatter.format(amount)}`;
};

const formatExchangeRate = (rate: number | null): string => {
  if (rate === null) return '暫無有效匯率';
  return exchangeRateFormatter.format(rate);
};

const formatFetchedAt = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '更新時間未知';
  return date.toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ExpenseOverview({
  overview,
  status,
  refreshWarning,
}: ExpenseOverviewProps) {
  if ((status === 'loading' || status === 'idle') && !overview) {
    return <Loading />;
  }
  if (status === 'error' && !overview) {
    return (
      <div className="rounded-lg bg-white p-6 text-center shadow-sm">
        <p className="font-serif text-sm text-red-600">
          整體費用載入失敗，記帳資料仍可在其他分頁查看。
        </p>
      </div>
    );
  }
  if (!overview) {
    return (
      <div className="rounded-lg bg-white p-6 text-center shadow-sm">
        <p className="font-serif text-gray-400">目前沒有可顯示的整體費用資料。</p>
      </div>
    );
  }

  const displayMode = getExpenseOverviewDisplayMode(overview);
  const approximate = displayMode !== 'complete';
  const cards = [
    {
      label: '目前預計總花費',
      amount: overview.totals.projectedTwd,
      tone: 'col-span-2 bg-[#f1f4f3] sm:col-span-1',
    },
    {
      label: '已實際支出',
      amount: overview.totals.paidTwd,
      tone: 'bg-white',
    },
    {
      label: '剩餘待付款',
      amount: overview.totals.unpaidTwd,
      tone: 'bg-white',
    },
  ];

  return (
    <div className="space-y-4">
      {refreshWarning ? <ExpenseWarning>{refreshWarning}</ExpenseWarning> : null}
      {overview.unconvertedCurrencies.length > 0 ? (
        <ExpenseWarning>
          {`${overview.unconvertedCurrencies.join('、')} 尚無有效匯率，未納入完整台幣總額。`}
        </ExpenseWarning>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`min-w-0 rounded-2xl border border-deep-blue/10 p-4 sm:p-5 ${card.tone}`}
          >
            <div className="font-serif text-xs text-ink/55">{card.label}</div>
            <div className="mt-2 break-words text-lg font-semibold tabular-nums tracking-tight text-deep-blue sm:text-2xl">
              {formatTwd(card.amount)}
            </div>
            <div className="mt-1 font-serif text-[11px] text-ink/40">
              兩人合計
              {approximate && card.amount !== null ? ' · 概估' : ''}
              {card.amount === null ? ' · 尚待完整匯率' : ''}
            </div>
          </div>
        ))}
      </div>

      <section className="expense-surface p-5">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-deep-blue">目前匯率</h2>
            <p className="mt-0.5 font-serif text-[13px] text-ink/45">
              每 1 單位外幣兌台幣
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {exchangeRateCurrencies.map((currency) => (
            <div
              key={currency}
              className="rounded-xl bg-deep-blue/5 px-3 py-2"
            >
              <div className="font-serif text-xs text-ink/45">1 {currency}</div>
              <div className="break-words text-xs font-semibold tabular-nums text-deep-blue sm:text-sm">
                {formatExchangeRate(overview.ratesTwdPerUnit[currency])}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="expense-surface p-5">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-deep-blue">主要費用分類</h2>
            <p className="mt-0.5 font-serif text-[13px] text-ink/45">
              原幣與目前匯率換算 · 兩人合計
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {overview.categories.map((category) => {
            const paidRatio =
              category.amount > 0
                ? Math.min(
                    100,
                    Math.max(
                      0,
                      category.paidAmount / category.amount * 100
                    )
                  )
                : 0;
            return (
              <div
                key={`${category.category}-${category.currency}`}
                className="border-b border-deep-blue/8 py-3 last:border-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-deep-blue">
                      {category.category}
                    </div>
                    <div className="mt-0.5 font-serif text-xs text-ink/45">
                      已付 {getCurrencySymbol(category.currency)}{' '}
                      {expenseAmountFormatter.format(category.paidAmount)} · 待付{' '}
                      {getCurrencySymbol(category.currency)}{' '}
                      {expenseAmountFormatter.format(category.unpaidAmount)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-sm font-semibold tabular-nums text-deep-blue">
                      {getCurrencySymbol(category.currency)}{' '}
                      {expenseAmountFormatter.format(category.amount)}
                    </div>
                    <div className="mt-0.5 font-serif text-xs text-ink/45">
                      {formatTwd(category.amountTwd, approximate)}
                    </div>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-deep-blue"
                    style={{ width: `${paidRatio}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="expense-surface p-5">
        <h2 className="text-sm font-semibold text-deep-blue">額外記帳</h2>
        <p className="mt-0.5 font-serif text-[13px] text-ink/45">
          依原始幣別保留，不與費用項目互相抵扣
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {overview.ledgerByCurrency.length > 0 ? (
            overview.ledgerByCurrency.map((entry) => (
              <div
                key={entry.currency}
                className="rounded-xl bg-deep-blue/5 px-3 py-2"
              >
                <div className="font-serif text-xs text-ink/45">
                  {entry.currency}
                </div>
                <div className="font-display text-sm font-semibold tabular-nums text-deep-blue">
                  {getCurrencySymbol(entry.currency)}{' '}
                  {expenseAmountFormatter.format(entry.amount)}
                </div>
                <div className="font-serif text-xs text-ink/40">
                  {formatTwd(entry.amountTwd, approximate)}
                </div>
              </div>
            ))
          ) : (
            <span className="font-serif text-sm text-ink/40">尚無額外記帳</span>
          )}
        </div>
      </section>

      <p className="text-center font-serif text-xs leading-relaxed text-ink/40">
        更新於 {formatFetchedAt(overview.fetchedAt)}
        <br />
        資料更新可能延遲約 45 秒。
      </p>
    </div>
  );
}
