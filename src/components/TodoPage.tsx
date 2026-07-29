import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { TodoItem } from '@/types';
import { htmlToText } from '@/utils/htmlToText';
import { tripClient } from '@/utils/tripClient';
import Loading from './Loading';

type TodoFilter = 'all' | 'pending' | 'done';

interface TodoPageProps {
  canEdit: boolean;
  todos: TodoItem[];
  loading: boolean;
  error: boolean;
  onTodosChange: Dispatch<SetStateAction<TodoItem[]>>;
}

interface HtmlTextProps {
  html: string;
  className?: string;
}

function HtmlText({ html, className = '' }: HtmlTextProps) {
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function TodoPage({
  canEdit,
  todos,
  loading,
  error,
  onTodosChange,
}: TodoPageProps) {
  const [filter, setFilter] = useState<TodoFilter>('all');
  const [updatingRows, setUpdatingRows] = useState<Set<number>>(new Set());

  const stats = useMemo(() => {
    const done = todos.filter((todo) => todo.done).length;
    return {
      total: todos.length,
      done,
      pending: todos.length - done,
    };
  }, [todos]);

  const filters = useMemo<Array<{ value: TodoFilter; label: string; count: number }>>(
    () => [
      { value: 'all', label: '全部', count: stats.total },
      { value: 'pending', label: '未完成', count: stats.pending },
      { value: 'done', label: '已完成', count: stats.done },
    ],
    [stats]
  );

  const groupedTodos = useMemo(() => {
    const visibleTodos = todos.filter((todo) => {
      if (filter === 'pending') return !todo.done;
      if (filter === 'done') return todo.done;
      return true;
    });
    const groups = new Map<string, TodoItem[]>();
    visibleTodos.forEach((todo) => {
      const section = todo.section || '未分類';
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section)!.push(todo);
    });
    return Array.from(groups.entries()).map(([section, items]) => ({
      section,
      items,
    }));
  }, [todos, filter]);

  const setRowUpdating = (rowNumber: number, updating: boolean) => {
    setUpdatingRows((current) => {
      const next = new Set(current);
      if (updating) next.add(rowNumber);
      else next.delete(rowNumber);
      return next;
    });
  };

  const setTodoDone = (rowNumber: number, done: boolean) => {
    onTodosChange((current) =>
      current.map((todo) =>
        todo.rowNumber === rowNumber ? { ...todo, done } : todo
      )
    );
  };

  const handleToggle = async (todo: TodoItem, done: boolean) => {
    if (!canEdit || updatingRows.has(todo.rowNumber)) return;

    const previousDone = todo.done;
    setRowUpdating(todo.rowNumber, true);
    setTodoDone(todo.rowNumber, done);

    try {
      const res = await tripClient.updateTodoStatus(
        todo.rowNumber,
        done,
        todo.item.replace(/<[^>]*>/g, '')
      );
      if (!res.success) {
        setTodoDone(todo.rowNumber, previousDone);
        alert(res.message);
      }
    } catch (error) {
      setTodoDone(todo.rowNumber, previousDone);
      alert('更新失敗');
    } finally {
      setRowUpdating(todo.rowNumber, false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="mb-2">
          <h2 className="font-display text-sm text-ink/80">待辦事項</h2>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-50 p-1">
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={`rounded-md py-2 text-center transition-colors ${
                filter === option.value
                  ? 'bg-ink text-white shadow-sm'
                  : 'text-ink/55 hover:bg-gold/10 hover:text-ink'
              }`}
            >
              <span className="block font-display text-[13px] tracking-wide">
                {option.label}
              </span>
              <span className="mt-0.5 block font-serif text-[12px] leading-none">
                {option.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {!canEdit && (
        <p className="bg-white rounded-lg shadow-sm px-4 py-3 text-xs text-ink/50 font-serif">
          目前為瀏覽模式，可查看待辦但無法勾選。
        </p>
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <div className="text-center mt-10 p-6 border border-dashed border-gray-300">
          <p className="text-gray-500 font-serif">待辦暫時無法載入</p>
        </div>
      ) : todos.length === 0 ? (
        <div className="text-center mt-10 p-6 border border-dashed border-gray-300">
          <p className="text-gray-500 font-serif">暫無待辦事項</p>
        </div>
      ) : groupedTodos.length === 0 ? (
        <p className="text-center text-gray-400 py-4">無符合條件的待辦</p>
      ) : (
        <div className="space-y-4">
          {groupedTodos.map(({ section, items }) => (
            <section
              key={section}
              className="bg-white rounded-lg shadow-sm overflow-hidden"
            >
              <div className="bg-gradient-to-r from-gold/5 to-transparent px-4 py-2.5 border-b border-gold/10">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-sm text-ink/75">
                    {section}
                  </h3>
                  <span className="font-serif text-[13px] text-ink/45">
                    {items.filter((todo) => todo.done).length}/{items.length}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((todo) => {
                  const isUpdating = updatingRows.has(todo.rowNumber);
                  return (
                    <div
                      key={todo.rowNumber}
                      className={`flex gap-3 px-4 py-3 transition-colors ${
                        todo.done ? 'bg-gray-50/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={todo.done}
                        disabled={!canEdit || isUpdating}
                        onChange={(e) => handleToggle(todo, e.target.checked)}
                        aria-label={`${todo.done ? '取消完成' : '完成'} ${htmlToText(todo.item)}`}
                        className="mt-1 h-4 w-4 shrink-0 accent-gold disabled:cursor-not-allowed disabled:opacity-40"
                        title={canEdit ? undefined : '需編輯權限'}
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className={`font-serif text-sm leading-relaxed ${
                            todo.done
                              ? 'text-ink/45 line-through'
                              : 'text-ink'
                          }`}
                        >
                          <HtmlText html={todo.item} />
                        </div>
                        {todo.detail && (
                          <p className="mt-1 font-serif text-xs leading-relaxed text-ink/60 break-words [&_a]:text-gold [&_a]:underline">
                            <HtmlText html={todo.detail} />
                          </p>
                        )}
                        {todo.deadline && (
                          <div className="mt-2 inline-flex max-w-full items-center rounded-full bg-gold/10 px-2 py-1 font-serif text-[13px] leading-snug text-gold">
                            <span className="mr-1 shrink-0">截止</span>
                            <HtmlText
                              html={todo.deadline}
                              className="min-w-0 break-words"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
