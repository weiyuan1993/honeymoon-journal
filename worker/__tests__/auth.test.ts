import { describe, expect, it, vi } from 'vitest';

import {
  authenticateGoogleCredential,
  buildExpiredSessionCookie,
  buildSessionCookie,
  createSessionToken,
  readSession,
  verifySessionToken,
} from '../auth';
import type {
  AuthBindings,
  EditorIdentity,
} from '../contracts';
import { ApiError, errorResponse } from '../http';

const SECRET =
  'a-test-only-session-secret-that-is-at-least-32-bytes';
const EDITOR: EditorIdentity = {
  sub: 'google-user-1',
  email: 'vic@example.com',
  name: 'Vic',
  role: 'editor',
};

describe('session authentication', () => {
  it('round-trips a signed editor session', async () => {
    const token = await createSessionToken(EDITOR, SECRET, {
      nowSeconds: 1_000,
      ttlSeconds: 60,
    });

    await expect(
      verifySessionToken(token, SECRET, { nowSeconds: 1_030 }),
    ).resolves.toMatchObject({
      email: 'vic@example.com',
      role: 'editor',
      issuedAt: 1_000,
      expiresAt: 1_060,
    });
  });

  it('rejects tampered, expired, and wrong-secret sessions', async () => {
    const token = await createSessionToken(EDITOR, SECRET, {
      nowSeconds: 1_000,
      ttlSeconds: 60,
    });
    const [payload, signature] = token.split('.');

    await expect(
      verifySessionToken(
        `${payload.slice(0, -1)}x.${signature}`,
        SECRET,
        { nowSeconds: 1_010 },
      ),
    ).resolves.toBeNull();
    await expect(
      verifySessionToken(token, `${SECRET}-different`, {
        nowSeconds: 1_010,
      }),
    ).resolves.toBeNull();
    await expect(
      verifySessionToken(token, SECRET, { nowSeconds: 1_060 }),
    ).resolves.toBeNull();
  });

  it('reads only the named session cookie', async () => {
    const token = await createSessionToken(EDITOR, SECRET);
    const request = new Request('https://trip.example/api/session', {
      headers: {
        cookie: `other=value; honeymoon_session=${token}; final=yes`,
      },
    });

    await expect(readSession(request, SECRET)).resolves.toMatchObject({
      email: 'vic@example.com',
    });
  });

  it('sets hardened cookie attributes for sign-in and sign-out', () => {
    expect(buildSessionCookie('signed-token')).toContain(
      'honeymoon_session=signed-token',
    );
    expect(buildSessionCookie('signed-token')).toContain('HttpOnly');
    expect(buildSessionCookie('signed-token')).toContain('Secure');
    expect(buildSessionCookie('signed-token')).toContain(
      'SameSite=Lax',
    );
    expect(buildExpiredSessionCookie()).toContain('Max-Age=0');
  });
});

describe('Google editor authentication', () => {
  const bindings: AuthBindings = {
    GOOGLE_CLIENT_ID: 'client-id',
    AUTHORIZED_EDITOR_EMAILS:
      'vic@example.com,dora@example.com',
    SESSION_SECRET: SECRET,
  };

  it('creates a session only for a verified allowlisted identity', async () => {
    const verifyCredential = vi.fn().mockResolvedValue({
      sub: 'google-user-2',
      email: ' Dora@Example.com ',
      name: 'Dora',
    });

    const result = await authenticateGoogleCredential(
      'google-credential',
      bindings,
      { verifyCredential },
    );

    expect(verifyCredential).toHaveBeenCalledWith(
      'google-credential',
      'client-id',
    );
    expect(result.identity).toMatchObject({
      email: 'dora@example.com',
      role: 'editor',
    });
    await expect(
      verifySessionToken(result.token, SECRET),
    ).resolves.toMatchObject({ email: 'dora@example.com' });
  });

  it('does not create a session for a verified but unauthorized account', async () => {
    const promise = authenticateGoogleCredential(
      'google-credential',
      bindings,
      {
        verifyCredential: vi.fn().mockResolvedValue({
          sub: 'other-user',
          email: 'other@example.com',
        }),
      },
    );

    await expect(promise).rejects.toMatchObject({
      status: 403,
      code: 'EDITOR_NOT_AUTHORIZED',
    });
  });
});

describe('sanitized errors', () => {
  it('never exposes an unknown error message', async () => {
    const response = errorResponse(
      new Error('private token and stack details'),
      'request-1',
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        retryable: false,
        requestId: 'request-1',
      },
    });
  });

  it('preserves deliberately public API errors', async () => {
    const response = errorResponse(
      new ApiError(429, 'RATE_LIMITED', 'Please retry.', {
        retryable: true,
      }),
      'request-2',
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'RATE_LIMITED',
        message: 'Please retry.',
        retryable: true,
      },
    });
  });
});
