import { afterEach, describe, expect, it, vi } from 'vitest';
import { authClient } from './apiClient';

describe('authClient.session', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('signals access revocation for an unauthorized editor session', async () => {
    const windowTarget = new EventTarget();
    const onSessionExpired = vi.fn();
    windowTarget.addEventListener('honeymoon:session-expired', onSessionExpired);
    vi.stubGlobal('window', windowTarget);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'EDITOR_NOT_AUTHORIZED', message: 'Access revoked' },
    }), { status: 403 })));

    await expect(authClient.session()).rejects.toMatchObject({
      status: 403,
      code: 'EDITOR_NOT_AUTHORIZED',
    });

    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('does not treat unrelated forbidden responses as a session expiration', async () => {
    const windowTarget = new EventTarget();
    const onSessionExpired = vi.fn();
    windowTarget.addEventListener('honeymoon:session-expired', onSessionExpired);
    vi.stubGlobal('window', windowTarget);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'RATE_LIMITED', message: 'Forbidden' },
    }), { status: 403 })));

    await expect(authClient.session()).rejects.toMatchObject({ status: 403 });

    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});
