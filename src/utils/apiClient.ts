import type { UserPermission } from '@/types';
import {
  isReadOperation,
  type ApiOperation,
} from '../../shared/apiOperations';

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    retryable?: boolean;
    requestId?: string;
  };
  message?: string;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = 'API_ERROR',
    readonly retryable = false
  ) {
    super(message);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json() as (T & ApiErrorPayload) | {
    data: T;
  } & ApiErrorPayload;
  if (!response.ok) {
    const accessRevoked = response.status === 401
      || (response.status === 403 && payload.error?.code === 'EDITOR_NOT_AUTHORIZED');
    if (accessRevoked && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('honeymoon:session-expired'));
    }
    throw new ApiClientError(
      payload.error?.message || payload.message || `Request failed (${response.status})`,
      response.status,
      payload.error?.code,
      payload.error?.retryable
    );
  }
  return 'data' in payload ? payload.data : payload;
}

export async function callWorker<T>(operation: ApiOperation, args: unknown[]): Promise<T> {
  const isRead = isReadOperation(operation) && args.length === 0;
  const response = await fetch(`/api/rpc/${encodeURIComponent(operation)}`, {
    method: isRead ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: isRead ? undefined : { 'content-type': 'application/json' },
    body: isRead ? undefined : JSON.stringify({ args }),
  });
  return parseResponse<T>(response);
}

export const authClient = {
  async getConfig(): Promise<{ clientId: string | null; enabled: boolean }> {
    return parseResponse(await fetch('/api/auth/config', { credentials: 'same-origin' }));
  },

  async login(credential: string): Promise<UserPermission> {
    return parseResponse(await fetch('/api/auth/google', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credential }),
    }));
  },

  async logout(): Promise<UserPermission> {
    return parseResponse(await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'same-origin',
    }));
  },

  async session(): Promise<UserPermission> {
    return parseResponse(await fetch('/api/auth/session', {
      credentials: 'same-origin',
    }));
  },
};
