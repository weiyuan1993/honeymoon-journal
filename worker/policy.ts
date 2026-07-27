import type {
  EditorIdentity,
  SessionClaims,
} from './contracts';
import { ApiError } from './http';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function parseAuthorizedEditorEmails(
  configuredEmails: string,
): ReadonlySet<string> {
  return new Set(
    configuredEmails
      .split(',')
      .map(normalizeEmail)
      .filter((email) => email.length > 0),
  );
}

export function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase('en-US');
}

export function isAuthorizedEditor(
  email: string,
  configuredEmails: string,
): boolean {
  return parseAuthorizedEditorEmails(configuredEmails).has(
    normalizeEmail(email),
  );
}

export function requireEditor(
  session: SessionClaims | null,
): EditorIdentity {
  if (!session) {
    throw new ApiError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Please sign in with an authorized account.',
    );
  }

  return {
    sub: session.sub,
    email: session.email,
    name: session.name,
    picture: session.picture,
    role: 'editor',
  };
}

export function assertSameOriginMutation(
  request: Request,
  configuredAppOrigin?: string,
): void {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return;
  }

  const origin = request.headers.get('origin');
  const expectedOrigin = configuredAppOrigin
    ? configuredOrigin(configuredAppOrigin)
    : new URL(request.url).origin;

  if (!origin || requestOrigin(origin) !== expectedOrigin) {
    throw new ApiError(
      403,
      'CROSS_ORIGIN_REQUEST',
      'This request must come from the application origin.',
    );
  }
}

function configuredOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    throw new ApiError(
      500,
      'AUTH_CONFIGURATION_ERROR',
      'Authentication is not configured correctly.',
    );
  }
}

function requestOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
