import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../index';
import { createSessionToken } from '../auth';
import { GeminiClient } from '../gemini';
import { TripRepository } from '../tripRepository';

const env = {
  ASSETS: { fetch: async () => new Response('asset') },
  GOOGLE_CLIENT_ID: 'client-id',
  AUTHORIZED_EDITOR_EMAILS: 'vic@example.com,dora@example.com',
  SESSION_SECRET: 'a-long-session-secret-for-tests-only',
  GOOGLE_SHEET_ID: 'sheet-id',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'service@example.com',
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: 'unused',
  GEMINI_API_KEY: 'unused',
};

describe('worker privacy boundary', () => {
  beforeEach(() => {
    vi.stubGlobal('caches', {
      open: vi.fn().mockResolvedValue({
        match: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(true),
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not return ticket metadata to anonymous callers', async () => {
    const response = await worker.fetch(
      new Request('https://trip.example/api/rpc/getTicketData'),
      env
    );
    const payload = await response.json() as { error?: { code?: string }; fileUrl?: string };

    expect(response.status).toBe(401);
    expect(payload.error?.code).toBe('AUTHENTICATION_REQUIRED');
    expect(JSON.stringify(payload)).not.toContain('fileUrl');
  });

  it('returns only the public OAuth client configuration', async () => {
    const response = await worker.fetch(
      new Request('https://trip.example/api/auth/config'),
      env
    );
    const payload = await response.json() as {
      data: { enabled: boolean; clientId: string };
    };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({ enabled: true, clientId: 'client-id' });
    expect(JSON.stringify(payload)).not.toContain(env.SESSION_SECRET);
  });

  it('returns practical reference links to anonymous callers', async () => {
    const links = [{
      category: '英國',
      label: '倫敦地鐵地圖',
      url: 'https://tfl.gov.uk/maps',
      note: '官方地鐵圖',
    }];
    vi.spyOn(TripRepository.prototype, 'getReferenceLinks').mockResolvedValue(
      links
    );

    const response = await worker.fetch(
      new Request('https://trip.example/api/rpc/getReferenceLinks'),
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: links });
  });

  it('returns the combined expense overview to anonymous callers', async () => {
    const overview = {
      fetchedAt: '2026-07-31T03:00:00.000Z',
      ratesTwdPerUnit: { TWD: 1, EUR: 35, CHF: 40, GBP: 43 },
      categories: [],
      ledgerByCurrency: [],
      components: {
        budgetProjectedTwd: 100,
        budgetPaidTwd: 40,
        budgetUnpaidTwd: 60,
        ledgerTwd: 10,
      },
      totals: {
        projectedTwd: 110,
        paidTwd: 50,
        unpaidTwd: 60,
      },
      warnings: [],
      unconvertedCurrencies: [],
      isComplete: true,
    };
    vi.spyOn(TripRepository.prototype, 'getExpenseOverview').mockResolvedValue(
      overview
    );

    const response = await worker.fetch(
      new Request('https://trip.example/api/rpc/getExpenseOverviewData'),
      env
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=45');
    expect(payload).toEqual({ data: overview });
    expect(JSON.stringify(payload)).not.toContain('sheet-id');
    expect(JSON.stringify(payload)).not.toContain('vic@example.com');
  });

  it('reuses one public cache entry across expense overview query variants', async () => {
    const overview = {
      fetchedAt: '2026-07-31T03:00:00.000Z',
      ratesTwdPerUnit: { TWD: 1 },
      categories: [],
      ledgerByCurrency: [],
      components: {
        budgetProjectedTwd: 100,
        budgetPaidTwd: 40,
        budgetUnpaidTwd: 60,
        ledgerTwd: 10,
      },
      totals: {
        projectedTwd: 110,
        paidTwd: 50,
        unpaidTwd: 60,
      },
      warnings: [],
      unconvertedCurrencies: [],
      isComplete: true,
    };
    const getExpenseOverview = vi
      .spyOn(TripRepository.prototype, 'getExpenseOverview')
      .mockResolvedValue(overview);
    const cacheEntries = new Map<string, Response>();
    vi.stubGlobal('caches', {
      open: vi.fn().mockResolvedValue({
        match: vi.fn(async (key: Request | string) => {
          const url = typeof key === 'string' ? key : key.url;
          return cacheEntries.get(url)?.clone();
        }),
        put: vi.fn(async (key: Request | string, response: Response) => {
          const url = typeof key === 'string' ? key : key.url;
          cacheEntries.set(url, response.clone());
        }),
        delete: vi.fn().mockResolvedValue(true),
      }),
    });

    const firstResponse = await worker.fetch(
      new Request(
        'https://trip.example/api/rpc/getExpenseOverviewData?refresh=first'
      ),
      env
    );
    const secondResponse = await worker.fetch(
      new Request(
        'https://trip.example/api/rpc/getExpenseOverviewData?refresh=second'
      ),
      env
    );

    await expect(firstResponse.json()).resolves.toEqual({ data: overview });
    await expect(secondResponse.json()).resolves.toEqual({ data: overview });
    expect(getExpenseOverview).toHaveBeenCalledTimes(1);
    expect(cacheEntries).toHaveLength(1);
    expect(cacheEntries.has(
      'https://trip.example/api/rpc/getExpenseOverviewData'
    )).toBe(true);
  });

  it('removes accommodation and itinerary reference links for anonymous callers', async () => {
    vi.spyOn(TripRepository.prototype, 'getItinerary').mockResolvedValue([
      {
        rowNumber: 2,
        day: 'Day 1',
        date: '2026-09-28',
        weekday: '一',
        city: '倫敦',
        content:
          '抵達 <a href="https://booking.example/manage?token=secret">飯店</a>，詳見https://booking.example/manage?token=secret。抵達後辦理入住',
        transport: '<a href="https://rail.example/ticket">車票</a>',
        ticket: '<a href="https://museum.example/reservation">預約</a>',
        link: 'https://booking.example/manage?token=secret',
        referenceLinks: [{
          label: '訂單管理',
          url: 'https://booking.example/manage?token=secret',
        }],
        hotel:
          '<a href="https://hotel.example/private">蜜月套房</a>，訂房資料https://hotel.example/private。已確認入住',
      },
    ]);

    const response = await worker.fetch(
      new Request('https://trip.example/api/rpc/getItineraryData'),
      env
    );
    const payload = await response.json() as {
      data: Array<Record<string, unknown>>;
    };

    expect(response.status).toBe(200);
    expect(payload.data[0]).toMatchObject({
      content:
        '抵達 <a href="https://booking.example/manage?token=secret">飯店</a>，詳見https://booking.example/manage?token=secret。抵達後辦理入住',
      transport: '<a href="https://rail.example/ticket">車票</a>',
      ticket: '<a href="https://museum.example/reservation">預約</a>',
      link: 'https://booking.example/manage?token=secret',
      referenceLinks: [],
      hotel: '蜜月套房，訂房資料。已確認入住',
    });
    expect(payload.data[0].hotel).not.toContain('https://hotel.example');
    expect(payload.data[0].hotel).not.toContain('<a');
  });

  it('returns full itinerary links to authorized editors without public caching', async () => {
    const itinerary = [{
      rowNumber: 2,
      day: 'Day 1',
      date: '2026-09-28',
      weekday: '一',
      city: '倫敦',
      content: '<a href="https://hotel.example/private">飯店</a>',
      transport: '',
      ticket: '',
      link: 'https://booking.example/manage?token=secret',
      referenceLinks: [{
        label: '訂單管理',
        url: 'https://booking.example/manage?token=secret',
      }],
      hotel:
        '<a href="https://hotel.example/manage?token=secret">蜜月套房</a>',
    }];
    vi.spyOn(TripRepository.prototype, 'getItinerary').mockResolvedValue(
      itinerary
    );
    const cachePut = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('caches', {
      open: vi.fn().mockResolvedValue({
        match: vi.fn().mockResolvedValue(undefined),
        put: cachePut,
        delete: vi.fn().mockResolvedValue(true),
      }),
    });
    const token = await createSessionToken(
      {
        sub: 'google-user-1',
        email: 'vic@example.com',
        role: 'editor',
      },
      env.SESSION_SECRET
    );

    const response = await worker.fetch(
      new Request('https://trip.example/api/rpc/getItineraryData', {
        headers: { cookie: `honeymoon_session=${token}` },
      }),
      env
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual({ data: itinerary });
    expect(cachePut).not.toHaveBeenCalled();
  });

  it('redacts todo links for anonymous callers', async () => {
    vi.spyOn(TripRepository.prototype, 'getTodos').mockResolvedValue([{
      rowNumber: 3,
      section: '出發前',
      item: '<a href="https://booking.example/item?token=secret">訂門票</a>',
      detail: '<a href="https://booking.example/detail?token=secret">官方預約</a> https://booking.example/plain?token=secret',
      links: [{
        label: '訂單管理',
        url: 'https://booking.example/manage?token=secret',
      }],
      done: false,
    }]);

    const response = await worker.fetch(
      new Request('https://trip.example/api/rpc/getTodoData'),
      env
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('public');
    await expect(response.json()).resolves.toEqual({
      data: [{
        rowNumber: 3,
        section: '出發前',
        item: '訂門票',
        detail: '官方預約',
        links: [],
        done: false,
      }],
    });
  });

  it('does not return legacy cached todo data to anonymous callers', async () => {
    const legacyCacheKey = 'https://trip.example/api/rpc/getTodoData';
    const todoCacheKey = `${legacyCacheKey}?__public_cache=todo-v3`;
    const cachedResponses = new Map<string, Response>([
      [legacyCacheKey, new Response(JSON.stringify({
        data: [{
          rowNumber: 3,
          section: '出發前',
          item: 'Legacy todo',
          detail: 'Legacy private link',
          links: [{
            label: 'Legacy booking',
            url: 'https://legacy.example.invalid/private',
          }],
          done: false,
        }],
      }))],
    ]);
    const cacheMatch = vi.fn().mockImplementation(async (key: Request | string) => {
      const url = typeof key === 'string' ? key : key.url;
      return cachedResponses.get(url)?.clone();
    });
    const cachePut = vi.fn().mockImplementation(async (key: Request | string, response: Response) => {
      const url = typeof key === 'string' ? key : key.url;
      cachedResponses.set(url, response.clone());
    });
    vi.stubGlobal('caches', {
      open: vi.fn().mockResolvedValue({
        match: cacheMatch,
        put: cachePut,
        delete: vi.fn().mockResolvedValue(true),
      }),
    });
    vi.spyOn(TripRepository.prototype, 'getTodos').mockResolvedValue([{
      rowNumber: 3,
      section: '出發前',
      item: 'Fresh todo',
      detail: 'Fresh details',
      links: [],
      done: false,
    }]);

    const response = await worker.fetch(
      new Request(legacyCacheKey),
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [{
        rowNumber: 3,
        section: '出發前',
        item: 'Fresh todo',
        detail: 'Fresh details',
        links: [],
        done: false,
      }],
    });
    expect(cacheMatch.mock.calls[0][0]).toBe(todoCacheKey);
    expect(cachePut.mock.calls[0][0]).toBe(todoCacheKey);
    expect(cachePut).toHaveBeenCalledTimes(1);
  });

  it('returns todo links to authorized editors without public caching', async () => {
    const todos = [{
      rowNumber: 3,
      section: '出發前',
      item: '訂門票',
      detail: '官方預約',
      links: [{
        label: '訂單管理',
        url: 'https://booking.example/manage?token=secret',
      }],
      done: false,
    }];
    vi.spyOn(TripRepository.prototype, 'getTodos').mockResolvedValue(todos);
    const cachePut = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('caches', {
      open: vi.fn().mockResolvedValue({
        match: vi.fn().mockResolvedValue(undefined),
        put: cachePut,
        delete: vi.fn().mockResolvedValue(true),
      }),
    });
    const token = await createSessionToken(
      {
        sub: 'google-user-1',
        email: 'vic@example.com',
        role: 'editor',
      },
      env.SESSION_SECRET
    );

    const response = await worker.fetch(
      new Request('https://trip.example/api/rpc/getTodoData', {
        headers: { cookie: `honeymoon_session=${token}` },
      }),
      env
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual({ data: todos });
    expect(cachePut).not.toHaveBeenCalled();
  });

  it('revokes an existing session immediately after allowlist removal', async () => {
    const token = await createSessionToken(
      {
        sub: 'google-user-1',
        email: 'vic@example.com',
        role: 'editor',
      },
      env.SESSION_SECRET
    );
    const revokedEnv = {
      ...env,
      AUTHORIZED_EDITOR_EMAILS: 'dora@example.com',
    };

    const privateResponse = await worker.fetch(
      new Request('https://trip.example/api/rpc/getTicketData', {
        headers: { cookie: `honeymoon_session=${token}` },
      }),
      revokedEnv
    );
    expect(privateResponse.status).toBe(403);
    await expect(privateResponse.json()).resolves.toMatchObject({
      error: { code: 'EDITOR_NOT_AUTHORIZED' },
    });

    const sessionResponse = await worker.fetch(
      new Request('https://trip.example/api/auth/session', {
        headers: { cookie: `honeymoon_session=${token}` },
      }),
      revokedEnv
    );
    await expect(sessionResponse.json()).resolves.toEqual({
      data: { email: null, canEdit: false },
    });
  });

  it.each(['updateTodoStatus', 'suggestItinerary'])(
    'rejects anonymous access to %s',
    async (operation) => {
      const response = await worker.fetch(
        new Request(`https://trip.example/api/rpc/${operation}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: 'https://trip.example',
          },
          body: JSON.stringify({ args: [] }),
        }),
        env
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: 'AUTHENTICATION_REQUIRED' },
      });
    }
  );

  it('allows an authorized editor to update a todo', async () => {
    vi.spyOn(TripRepository.prototype, 'updateTodoStatus').mockResolvedValue({
      success: true,
      message: '待辦狀態已更新',
    });
    const cacheDelete = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', {
      open: vi.fn().mockResolvedValue({ delete: cacheDelete }),
    });
    const token = await createSessionToken(
      {
        sub: 'google-user-1',
        email: 'vic@example.com',
        role: 'editor',
      },
      env.SESSION_SECRET
    );

    const response = await worker.fetch(
      new Request('https://trip.example/api/rpc/updateTodoStatus', {
        method: 'POST',
        headers: {
          cookie: `honeymoon_session=${token}`,
          'content-type': 'application/json',
          origin: 'https://trip.example',
        },
        body: JSON.stringify({ args: [2, true, 'Book train'] }),
      }),
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { success: true, message: '待辦狀態已更新' },
    });
    expect(cacheDelete).toHaveBeenCalledWith(
      'https://trip.example/api/rpc/getTodoData'
    );
    expect(cacheDelete).toHaveBeenCalledWith(
      'https://trip.example/api/rpc/getTodoData?__public_cache=todo-v3'
    );
  });

  it('invalidates the public expense overview cache after an expense mutation', async () => {
    vi.spyOn(TripRepository.prototype, 'saveExpense').mockResolvedValue({
      success: true,
      message: '記帳成功！',
    });
    const cacheDelete = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', {
      open: vi.fn().mockResolvedValue({
        match: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
        delete: cacheDelete,
      }),
    });
    const token = await createSessionToken(
      {
        sub: 'google-user-1',
        email: 'vic@example.com',
        role: 'editor',
      },
      env.SESSION_SECRET
    );

    const response = await worker.fetch(
      new Request('https://trip.example/api/rpc/saveExpense', {
        method: 'POST',
        headers: {
          cookie: `honeymoon_session=${token}`,
          'content-type': 'application/json',
          origin: 'https://trip.example',
        },
        body: JSON.stringify({
          args: [{
            item: 'Lunch',
            amount: '10',
            currency: 'EUR',
            category: 'Food',
          }],
        }),
      }),
      env
    );

    expect(response.status).toBe(200);
    expect(cacheDelete).toHaveBeenCalledWith(
      'https://trip.example/api/rpc/getExpenseOverviewData'
    );
  });

  it('allows an authorized editor to use an AI operation', async () => {
    vi.spyOn(GeminiClient.prototype, 'generate').mockResolvedValue('Paris plan');
    const token = await createSessionToken(
      {
        sub: 'google-user-1',
        email: 'vic@example.com',
        role: 'editor',
      },
      env.SESSION_SECRET
    );

    const response = await worker.fetch(
      new Request('https://trip.example/api/rpc/suggestItinerary', {
        method: 'POST',
        headers: {
          cookie: `honeymoon_session=${token}`,
          'content-type': 'application/json',
          origin: 'https://trip.example',
        },
        body: JSON.stringify({ args: ['Paris'] }),
      }),
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { success: true, content: 'Paris plan' },
    });
  });
});
