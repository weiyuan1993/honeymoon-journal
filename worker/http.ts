import type { ApiErrorBody, ApiSuccessBody } from './contracts';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
} as const;

export const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;

  constructor(
    status: number,
    code: string,
    message: string,
    options: { retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}

export function getRequestId(request: Request): string {
  return request.headers.get('cf-ray') ?? crypto.randomUUID();
}

export function jsonResponse<T>(
  data: T,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(JSON_HEADERS)) {
    if (!headers.has(name)) {
      headers.set(name, value);
    }
  }

  const body: ApiSuccessBody<T> = { data };
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function privateJsonResponse<T>(
  data: T,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(PRIVATE_NO_STORE_HEADERS)) {
    headers.set(name, value);
  }
  return jsonResponse(data, { ...init, headers });
}

export function errorResponse(error: unknown, requestId: string): Response {
  const apiError =
    error instanceof ApiError
      ? error
      : new ApiError(
          500,
          'INTERNAL_ERROR',
          'An unexpected error occurred.',
        );

  const body: ApiErrorBody = {
    error: {
      code: apiError.code,
      message: apiError.message,
      retryable: apiError.retryable,
      requestId,
    },
  };

  return new Response(JSON.stringify(body), {
    status: apiError.status,
    headers: {
      ...JSON_HEADERS,
      ...PRIVATE_NO_STORE_HEADERS,
    },
  });
}
