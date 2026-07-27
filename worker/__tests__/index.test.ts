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
