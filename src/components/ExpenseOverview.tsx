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

const formatTwd = (amount: number | null, approximate = false): string => {
  if (amount === null || !Number.isFinite(amount)) return '暫無法換算';
  return `${approximate ? '約 ' : ''}NT$${twdFormatter.format(amount)}`;
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
      tone: 'from-gold/20 to-gold/5 text-gold',
    },
    {
      label: '已實際支出',
      amount: overview.totals.paidTwd,
      tone: 'from-deep-blue/15 to-deep-blue/5 text-deep-blue',
    },
    {
      label: '剩餘待付款',
      amount: overview.totals.unpaidTwd,
      tone: 'from-amber-100 to-amber-50 text-amber-700',
    },
  ];

  return (
    <div className="space-y-4">
      {refreshWarning ? <ExpenseWarning>{refreshWarning}</ExpenseWarning> : null}
      {displayMode === 'incomplete' ? (
        <ExpenseWarning>
          部分金額或匯率尚未完整，以下台幣數字為目前可換算的概況，不代表最終結算。
        </ExpenseWarning>
      ) : null}
      {overview.unconvertedCurrencies.length > 0 ? (
        <ExpenseWarning>
          {`${overview.unconvertedCurrencies.join('、')} 尚無有效匯率，未納入完整台幣總額。`}
        </ExpenseWarning>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border border-white/70 bg-gradient-to-br p-4 shadow-sm ${card.tone}`}
          >
            <div className="font-serif text-xs text-ink/55">{card.label}</div>
            <div className="mt-1 font-display text-xl font-bold">
              {formatTwd(card.amount, approximate)}
            </div>
            <div className="mt-1 font-serif text-[11px] text-ink/40">
              兩人合計
              {card.amount === null ? ' · 尚待完整匯率' : ''}
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-sm text-ink/80">主要費用分類</h2>
            <p className="mt-0.5 font-serif text-[13px] text-ink/45">
              原幣與目前匯率換算 · 兩人合計
            </p>
          </div>
          <span className="font-serif text-xs text-ink/35">Google Sheet</span>
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
                className="rounded-xl border border-gray-100 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-display text-sm text-ink/80">
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
                    <div className="font-display text-sm font-bold text-gold">
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

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-display text-sm text-ink/80">額外記帳</h2>
        <p className="mt-0.5 font-serif text-[13px] text-ink/45">
          依原始幣別保留，不與費用項目互相抵扣
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {overview.ledgerByCurrency.length > 0 ? (
            overview.ledgerByCurrency.map((entry) => (
              <div
                key={entry.currency}
                className="rounded-xl bg-gold/10 px-3 py-2"
              >
                <div className="font-serif text-xs text-ink/45">
                  {entry.currency}
                </div>
                <div className="font-display text-sm font-bold text-gold">
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

      {overview.warnings.length > 0 ? (
        <details className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <summary className="cursor-pointer font-display text-sm text-amber-800">
            資料提醒（{overview.warnings.length}）
          </summary>
          <ul className="mt-2 space-y-1 pl-4 font-serif text-xs text-amber-800">
            {overview.warnings.map((warning, index) => (
              <li key={`${warning}-${index}`} className="list-disc">
                {warning}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <p className="text-center font-serif text-xs leading-relaxed text-ink/40">
        更新於 {formatFetchedAt(overview.fetchedAt)}
        <br />
        Google Sheet 修改後，網站最多可能延遲約 45 秒顯示。
      </p>
    </div>
  );
}
