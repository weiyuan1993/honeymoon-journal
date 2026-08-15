import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/apiClient', () => ({
  authClient: {},
  callWorker: vi.fn(),
}));

import { callWorker } from '@/utils/apiClient';
import { tripClient } from './tripClient';

describe('tripClient todo data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes the deployed single-link todo response during the rollout', async () => {
    vi.mocked(callWorker).mockResolvedValueOnce([{
      rowNumber: 3,
      section: '出發前',
      item: '訂門票',
      detail: '官方預約',
      deadline: '8/1，詳見 https://example.com/book',
      link: 'https://example.com/book',
      done: false,
    }] as never);

    await expect(tripClient.getTodoData(true)).resolves.toEqual([{
      rowNumber: 3,
      section: '出發前',
      item: '訂門票',
      detail: '官方預約<br>期限／狀態：8/1，詳見',
      links: [{ label: '訂票連結', url: 'https://example.com/book' }],
      done: false,
    }]);
  });

  it('keeps detail URLs that are not present in the link column', async () => {
    vi.mocked(callWorker).mockResolvedValueOnce([{
      rowNumber: 3,
      section: '出發前',
      item: '訂門票',
      detail: '出發資訊 https://example.com/arrival',
      link: 'https://example.com/book',
      done: false,
    }] as never);

    await expect(tripClient.getTodoData(true)).resolves.toEqual([{
      rowNumber: 3,
      section: '出發前',
      item: '訂門票',
      detail: '出發資訊 https://example.com/arrival',
      links: [{ label: '訂票連結', url: 'https://example.com/book' }],
      done: false,
    }]);
  });

  it('drops unsafe legacy booking URLs before rendering them', async () => {
    vi.mocked(callWorker).mockResolvedValueOnce([{
      rowNumber: 3,
      section: '出發前',
      item: '訂門票',
      detail: '官方預約',
      link: 'javascript:alert(1)',
      done: false,
    }] as never);

    await expect(tripClient.getTodoData()).resolves.toEqual([{
      rowNumber: 3,
      section: '出發前',
      item: '訂門票',
      detail: '官方預約',
      links: [],
      done: false,
    }]);
  });

  it('redacts all legacy URLs before an editor session is confirmed', async () => {
    vi.mocked(callWorker).mockResolvedValueOnce([{
      rowNumber: 3,
      section: '出發前',
      item: '訂門票',
      detail: '出發資訊 https://example.com/arrival',
      link: 'https://example.com/book',
      done: false,
    }] as never);

    await expect(tripClient.getTodoData()).resolves.toEqual([{
      rowNumber: 3,
      section: '出發前',
      item: '訂門票',
      detail: '出發資訊',
      links: [],
      done: false,
    }]);
  });
});
