import { describe, expect, it } from 'vitest';
import worker from '../index';
import { createSessionToken } from '../auth';

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
});
