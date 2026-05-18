import { useState } from 'react';
import type { ExpenseItem as ExpenseItemType } from '@/types';
import { tripConfig } from '@/config/trip.config';
import { gasClient } from '@/utils/gasClient';

interface ExpenseItemProps {
  data: ExpenseItemType;
  onUpdate: () => void;
  onDelete: (rowNumber: number) => void;
  canEdit: boolean;
}

const currencySymbol = (currency: string): string => {
  switch (currency) {
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'TWD':
      return 'NT$';
    default:
      return 'CHF';
  }
};

export default function ExpenseItem({
  data,
  onUpdate,
  onDelete,
  canEdit,
}: ExpenseItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...data });
  const [saving, setSaving] = useState(false);

  // Date is already shown by the group header; rows only need the time.
  let timeStr = 'Unknown';
  try {
    if (data.timestamp) {
      const d = new Date(data.timestamp);
      if (!isNaN(d.getTime())) {
        timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      } else {
        timeStr = String(data.timestamp);
      }
    }
  } catch {
    // Keep default
  }

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await gasClient.editExpense(editForm as ExpenseItemType);
      if (res.success) {
        setIsEditing(false);
        onUpdate();
      } else {
        alert(res.message);
      }
    } catch (error) {
      alert('更新失敗');
    }
    setSaving(false);
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSave();
  };

  const handleStartEdit = () => {
    setEditForm({ ...data });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditForm({ ...data });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!canEdit) return;
    if (confirm(`確定要刪除「${data.item}」嗎？`)) {
      onDelete(data.rowNumber);
    }
  };

  if (isEditing) {
    return (
      <form
        onSubmit={handleEditSubmit}
        className="bg-gold/5 px-3 py-2.5"
      >
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div>
            <div className="font-display text-sm text-ink/80">編輯花費</div>
            <div className="mt-0.5 font-serif text-[11px] text-ink/45">
              {timeStr}
            </div>
          </div>
          <div className="rounded-lg bg-white px-2.5 py-1 text-right shadow-sm">
            <div className="font-serif text-[10px] leading-none text-ink/45">
              {currencySymbol(String(editForm.currency))}
            </div>
            <div className="mt-0.5 font-display text-sm font-bold text-gold">
              {editForm.amount || '0'}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          <input
            type="text"
            name="item"
            value={editForm.item}
            onChange={handleEditChange}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-serif text-sm text-ink transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
            placeholder="項目"
          />
          <div className="grid grid-cols-5 gap-2">
            <input
              type="number"
              name="amount"
              value={editForm.amount}
              onChange={handleEditChange}
              className="col-span-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-serif text-sm text-ink transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
              placeholder="金額"
            />
            <select
              name="currency"
              value={editForm.currency}
              onChange={handleEditChange}
              className="col-span-2 rounded-lg border border-gray-200 bg-white px-2 py-2.5 font-serif text-sm text-ink transition-colors focus:border-gold focus:outline-none"
            >
              {tripConfig.currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.label}
                </option>
              ))}
            </select>
          </div>
          <select
            name="category"
            value={editForm.category}
            onChange={handleEditChange}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-serif text-sm text-ink transition-colors focus:border-gold focus:outline-none"
          >
            {tripConfig.categories.map((category) => (
              <option key={category.code} value={category.code}>
                {category.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 rounded-lg py-2.5 font-display text-sm text-white transition-all ${
                saving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-forest hover:bg-forest/90 shadow-sm'
              }`}
            >
              {saving ? '...' : '儲存'}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={saving}
              className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 font-display text-sm text-ink/60 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              取消
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="px-3 py-2.5 flex justify-between items-center hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-gray-400 font-serif flex items-center gap-1.5">
          <span>{timeStr}</span>
          <span className="bg-gold/10 text-gold px-1.5 py-0.5 rounded text-[10px]">
            {data.category}
          </span>
        </div>
        <div className="font-serif text-sm text-ink truncate">{data.item}</div>
      </div>
      <div className="text-right flex items-center gap-1.5">
        <div className="font-display text-sm font-bold text-gold whitespace-nowrap">
          {currencySymbol(data.currency)} {data.amount}
        </div>
        <div className="flex gap-0.5">
            <button
              onClick={handleStartEdit}
              disabled={!canEdit}
              className={`transition-colors p-0.5 ${
                canEdit
                  ? 'text-gray-300 hover:text-gold'
                  : 'text-gray-200 cursor-not-allowed'
              }`}
              title={canEdit ? '編輯' : '需編輯權限'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={!canEdit}
              className={`transition-colors p-0.5 ${
                canEdit
                  ? 'text-gray-300 hover:text-red-500'
                  : 'text-gray-200 cursor-not-allowed'
              }`}
              title={canEdit ? '刪除' : '需編輯權限'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          </div>
      </div>
    </div>
  );
}
