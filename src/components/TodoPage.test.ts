import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TodoItem } from '@/types';
import TodoPage from './TodoPage';

const todo = (overrides: Partial<TodoItem> = {}): TodoItem => ({
  rowNumber: 3,
  section: '出發前',
  item: '訂門票',
  detail: '',
  links: [],
  done: false,
  ...overrides,
});

describe('TodoPage', () => {
  it('renders each booking link as its own editor-only external action', () => {
    const html = renderToStaticMarkup(
      createElement(TodoPage, {
        canEdit: true,
        todos: [todo({
          links: [
            { label: '巴黎博物館通票', url: 'https://example.com/pass' },
            { label: '羅浮宮時段', url: 'https://example.com/louvre' },
          ],
        })],
        loading: false,
        error: false,
        isActive: true,
        navigation: { rowNumber: null, request: 0 },
        onTodosChange: () => undefined,
      })
    );

    expect(html).toContain('href="https://example.com/pass"');
    expect(html).toContain('href="https://example.com/louvre"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('巴黎博物館通票');
    expect(html).toContain('羅浮宮時段');
  });

  it('does not render todo links without editor access', () => {
    const html = renderToStaticMarkup(
      createElement(TodoPage, {
        canEdit: false,
        todos: [todo({
          item: '<a href="https://example.com/private-booking">訂門票</a>',
          detail: '詳見 https://example.com/private-booking',
          links: [{ label: '巴黎博物館通票', url: 'https://example.com/pass' }],
        })],
        loading: false,
        error: false,
        isActive: true,
        navigation: { rowNumber: null, request: 0 },
        onTodosChange: () => undefined,
      })
    );

    expect(html).not.toContain('巴黎博物館通票');
    expect(html).not.toContain('href="https://example.com/pass"');
    expect(html).not.toContain('href="https://example.com/private-booking"');
    expect(html).not.toContain('https://example.com/private-booking');
  });

  it('renders linked detail text without a clickable detail link', () => {
    const html = renderToStaticMarkup(
      createElement(TodoPage, {
        canEdit: true,
        todos: [todo({
          detail: '<a href="https://example.com/detail">訂票明細</a>',
        })],
        loading: false,
        error: false,
        isActive: true,
        navigation: { rowNumber: null, request: 0 },
        onTodosChange: () => undefined,
      })
    );

    expect(html).toContain('訂票明細');
    expect(html).not.toContain('href="https://example.com/detail"');
    expect(html).not.toContain('訂票連結');
  });
});
