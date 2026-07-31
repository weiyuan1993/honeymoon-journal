import type { ReactNode } from 'react';
import Loading from './Loading';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type SubmitStatus = 'idle' | 'submitting' | 'success';

export const expenseAmountFormatter = new Intl.NumberFormat('zh-TW', {
  maximumFractionDigits: 2,
});

interface WarningNoticeProps {
  children: string;
}

export function ExpenseWarning({ children }: WarningNoticeProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-serif text-sm text-amber-800">
      {children}
    </div>
  );
}

interface ExpenseLedgerStateProps {
  status: LoadStatus;
  isEmpty: boolean;
  emptyText: string;
  children: ReactNode;
}

export function ExpenseLedgerState({
  status,
  isEmpty,
  emptyText,
  children,
}: ExpenseLedgerStateProps) {
  if (status === 'loading' || status === 'idle') return <Loading />;
  if (status === 'error') {
    return (
      <div className="rounded-lg bg-white p-6 text-center shadow-sm">
        <p className="font-serif text-sm text-red-600">
          花費記錄載入失敗，請稍後再試。
        </p>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="rounded-lg bg-white p-6 text-center shadow-sm">
        <p className="font-serif text-gray-400">{emptyText}</p>
      </div>
    );
  }
  return children;
}
