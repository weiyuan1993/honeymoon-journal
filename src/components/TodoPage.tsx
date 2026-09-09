import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
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
  isActive: boolean;
  navigation: {
    rowNumber: number | null;
    request: number;
  };
  onTodosChange: Dispatch<SetStateAction<TodoItem[]>>;
}

interface HtmlTextProps {
  html: string;
  className?: string;
}

const PLAIN_URL_PATTERN =
  /https?:\/\/[^\s<>"'，。！？、；：）】》〉」』〕］}]+/gi;

function redactedTodoText(value: string): string {
  return htmlToText(value)
    .replace(PLAIN_URL_PATTERN, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
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
  isActive,
  navigation,
  onTodosChange,
}: TodoPageProps) {
  const [filter, setFilter] = useState<TodoFilter>('all');
  const [updatingRows, setUpdatingRows] = useState<Set<number>>(new Set());
  const handledNavigationRequestRef = useRef(0);

  useEffect(() => {
    if (!isActive || navigation.request === 0) return;
    setFilter('pending');
  }, [isActive, navigation.request]);

  useEffect(() => {
    if (
      !isActive ||
      navigation.request === 0 ||
      handledNavigationRequestRef.current === navigation.request ||
      loading ||
      filter !== 'pending'
    ) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (navigation.rowNumber === null) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        handledNavigationRequestRef.current = navigation.request;
        return;
      }
      const target = document.getElementById(
        `todo-row-${navigation.rowNumber}`
      );
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        handledNavigationRequestRef.current = navigation.request;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [filter, isActive, loading, navigation, todos]);

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
    <div className="todo-page mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-deep-blue">待辦事項</h1>
        {!loading && !error && stats.total > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-ink/55">已完成 {stats.done} / {stats.total}</span>
            <div role="progressbar" aria-label="待辦完成進度" aria-valuemin={0}
              aria-valuemax={stats.total} aria-valuenow={stats.done}
              className="h-1.5 w-20 overflow-hidden rounded-full bg-deep-blue/10">
              <div className="h-full rounded-full bg-deep-blue transition-all"
                style={{ width: `${stats.done / stats.total * 100}%` }} />
            </div>
          </div>
        ) : null}
      </header>
      <div role="group" aria-label="待辦狀態"
        className="inline-flex max-w-full gap-1 rounded-2xl border border-deep-blue/10 bg-deep-blue/5 p-1">
        {filters.map((option) => (
          <button key={option.value} type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm transition-colors sm:px-4 ${
              filter === option.value
                ? 'bg-white font-medium text-deep-blue shadow-sm'
                : 'text-ink/55 hover:bg-white/60 hover:text-deep-blue'
            }`}>
            {option.label}
            <span className="text-xs tabular-nums opacity-60">{option.count}</span>
          </button>
        ))}
      </div>

      {!canEdit && (
        <p className="text-xs leading-relaxed text-ink/50">
          目前為瀏覽模式，可查看待辦但無法勾選。
        </p>
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <div className="rounded-2xl border border-deep-blue/10 bg-white/60 p-8 text-center">
          <p className="text-gray-500 font-serif">待辦暫時無法載入</p>
        </div>
      ) : todos.length === 0 ? (
        <div className="rounded-2xl border border-deep-blue/10 bg-white/60 p-8 text-center">
          <p className="text-gray-500 font-serif">暫無待辦事項</p>
        </div>
      ) : groupedTodos.length === 0 ? (
        <p className="text-center text-gray-400 py-4">無符合條件的待辦</p>
      ) : (
        <div className="space-y-4">
          {groupedTodos.map(({ section, items }) => (
            <section
              key={section}
              className="overflow-hidden rounded-[20px] border border-deep-blue/10 bg-[#fffefa]"
            >
              <div className="border-b border-deep-blue/8 bg-deep-blue/3 px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-deep-blue">
                    {section}
                  </h3>
                  <span className="text-xs tabular-nums text-ink/45">
                    {items.filter((todo) => todo.done).length}/{items.length}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((todo) => {
                  const isUpdating = updatingRows.has(todo.rowNumber);
                  const itemText = canEdit
                    ? htmlToText(todo.item)
                    : redactedTodoText(todo.item);
                  return (
                    <div
                      key={todo.rowNumber}
                      id={`todo-row-${todo.rowNumber}`}
                      className={`flex gap-2 px-3 py-4 transition-colors sm:gap-3 sm:px-4 ${
                        todo.done ? 'bg-deep-blue/2' : 'hover:bg-deep-blue/2'
                      }`}
                    >
                      <label className="flex min-h-11 w-9 shrink-0 cursor-pointer items-start justify-center pt-1 has-[:disabled]:cursor-default">
                        <input
                          type="checkbox"
                          checked={todo.done}
                          disabled={!canEdit || isUpdating}
                          onChange={(e) => handleToggle(todo, e.target.checked)}
                          aria-label={`${todo.done ? '取消完成' : '完成'} ${itemText}`}
                          className="h-5 w-5 cursor-pointer accent-deep-blue disabled:cursor-not-allowed disabled:opacity-40"
                          title={canEdit ? undefined : '需編輯權限'}
                        />
                      </label>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div
                          className={`text-sm leading-relaxed break-words ${
                            todo.done
                              ? 'text-ink/45 line-through'
                              : 'text-ink'
                          }`}
                        >
                          {canEdit ? <HtmlText html={todo.item} /> : itemText}
                        </div>
                        {todo.detail && (
                          <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-ink/55 break-words">
                            {canEdit ? htmlToText(todo.detail) : redactedTodoText(todo.detail)}
                          </p>
                        )}
                        {canEdit && todo.links.length > 0 ? (
                          <div className="mt-3">
                            <ul className="flex flex-wrap gap-2">
                              {todo.links.map((link, index) => (
                                <li key={`${link.url}-${index}`} className="min-w-0 max-w-full">
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`開啟 ${itemText} 的 ${link.label}`}
                                    className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-lg border border-deep-blue/10 bg-white px-3 py-1.5 text-xs text-deep-blue transition-colors hover:bg-deep-blue/5"
                                  >
                                    <span className="break-all">{link.label}</span>
                                    <span aria-hidden="true">↗</span>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
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
