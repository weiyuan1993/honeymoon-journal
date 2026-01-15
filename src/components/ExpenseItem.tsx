import { useState } from 'react';
import type { ExpenseItem as ExpenseItemType } from '@/types';
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

  // Format date string
  let dateStr = 'Unknown';
  try {
    if (data.timestamp) {
      const d = new Date(data.timestamp);
      if (!isNaN(d.getTime())) {
        dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      } else {
        dateStr = String(data.timestamp);
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

  const handleDelete = () => {
    if (confirm(`確定要刪除「${data.item}」嗎？`)) {
      onDelete(data.rowNumber);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-gold p-4 mb-3 shadow-md rounded-sm">
        <div className="grid grid-cols-1 gap-3">
          <input
            type="text"
            name="item"
            value={editForm.item}
            onChange={handleEditChange}
            className="border p-2 w-full font-serif"
            placeholder="項目"
          />
          <div className="flex gap-2">
            <input
              type="number"
              name="amount"
              value={editForm.amount}
              onChange={handleEditChange}
              className="border p-2 w-2/3 font-serif"
              placeholder="金額"
            />
            <select
              name="currency"
              value={editForm.currency}
              onChange={handleEditChange}
              className="border p-2 w-1/3 font-serif"
            >
              <option value="EUR">€</option>
              <option value="CHF">CHF</option>
              <option value="GBP">£</option>
              <option value="TWD">NT$</option>
            </select>
          </div>
          <select
            name="category"
            value={editForm.category}
            onChange={handleEditChange}
            className="border p-2 w-full font-serif"
          >
            <option value="Food">餐飲</option>
            <option value="Transport">交通</option>
            <option value="Shopping">購物</option>
            <option value="Ticket">門票</option>
            <option value="Toilet">廁所</option>
            <option value="Other">其他</option>
          </select>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-forest text-white py-2 rounded font-display text-sm"
            >
              {saving ? '...' : '儲存'}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded font-display text-sm"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-subtle p-4 mb-3 shadow-sm rounded-sm flex justify-between items-center">
      <div className="flex-1">
        <div className="text-xs text-gray-400 font-serif mb-1">
          {dateStr}{' '}
          <span className="ml-2 bg-gray-100 px-1 rounded text-gray-500">
            {data.category}
          </span>
        </div>
        <div className="font-bold text-ink text-lg">{data.item}</div>
      </div>
      <div className="text-right">
        <div className="font-display font-bold text-gold text-lg">
          {currencySymbol(data.currency)} {data.amount}
        </div>
        {canEdit && (
          <div className="mt-1 flex gap-2 justify-end">
            <button
              onClick={() => setIsEditing(true)}
              className="text-gray-400 hover:text-blue-600 transition-colors p-1.5"
              title="編輯"
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
              className="text-gray-400 hover:text-red-600 transition-colors p-1.5"
              title="刪除"
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
        )}
      </div>
    </div>
  );
}
