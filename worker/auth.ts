import type {
  AuthBindings,
  EditorIdentity,
  GoogleIdentity,
  SessionClaims,
} from './contracts';
import {
  verifyGoogleIdToken,
  type GoogleIdentityVerificationOptions,
} from './googleIdentity';
import { ApiError } from './http';
import {
  isAuthorizedEditor,
  normalizeEmail,
} from './policy';

export const SESSION_COOKIE_NAME = 'honeymoon_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

interface SessionOptions {
  nowSeconds?: number;
  ttlSeconds?: number;
}

interface AuthenticationDependencies {
  googleVerification?: GoogleIdentityVerificationOptions;
  verifyCredential?: (
    credential: string,
    clientId: string,
  ) => Promise<GoogleIdentity>;
}

export interface AuthenticatedSession {
  cookie: string;
  identity: EditorIdentity;
  token: string;
}

export async function authenticateGoogleCredential(
  credential: string,
  bindings: AuthBindings,
  dependencies: AuthenticationDependencies = {},
): Promise<AuthenticatedSession> {
  assertAuthBindings(bindings);

  const identity = dependencies.verifyCredential
    ? await dependencies.verifyCredential(
        credential,
        bindings.GOOGLE_CLIENT_ID,
      )
    : await verifyGoogleIdToken(
        credential,
        bindings.GOOGLE_CLIENT_ID,
        dependencies.googleVerification,
      );
  const email = normalizeEmail(identity.email);

  if (
    !isAuthorizedEditor(
      email,
      bindings.AUTHORIZED_EDITOR_EMAILS,
    )
  ) {
    throw new ApiError(
      403,
      'EDITOR_NOT_AUTHORIZED',
      'This Google account does not have editor access.',
    );
  }

  const editor: EditorIdentity = {
    ...identity,
    email,
    role: 'editor',
  };
  const token = await createSessionToken(
    editor,
    bindings.SESSION_SECRET,
  );

  return {
    cookie: buildSessionCookie(token),
    identity: editor,
    token,
  };
}

export async function createSessionToken(
  identity: EditorIdentity,
  secret: string,
  options: SessionOptions = {},
): Promise<string> {
  assertSessionSecret(secret);

  const issuedAt =
    options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const ttlSeconds =
    options.ttlSeconds ?? SESSION_TTL_SECONDS;
  const claims: SessionClaims = {
    ...identity,
    version: 1,
    issuedAt,
    expiresAt: issuedAt + ttlSeconds,
  };
  const encodedClaims = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify(claims)),
  );
  const signature = await sign(encodedClaims, secret);

  return `${encodedClaims}.${encodeBase64Url(signature)}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
  options: Pick<SessionOptions, 'nowSeconds'> = {},
): Promise<SessionClaims | null> {
  if (!token || !secret) {
    return null;
  }

  const [encodedClaims, encodedSignature, extra] = token.split('.');
  if (
    !encodedClaims ||
    !encodedSignature ||
    extra !== undefined
  ) {
    return null;
  }

  let signature: Uint8Array<ArrayBuffer>;
  try {
    signature = decodeBase64Url(encodedSignature);
  } catch {
    return null;
  }

  const key = await importHmacKey(secret, ['verify']);
  const signatureIsValid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    new TextEncoder().encode(encodedClaims),
  );
  if (!signatureIsValid) {
    return null;
  }

  const claims = decodeClaims(encodedClaims);
  const nowSeconds =
    options.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (!claims || !sessionClaimsAreValid(claims, nowSeconds)) {
    return null;
  }

  return claims;
}

export async function readSession(
  request: Request,
  secret: string,
): Promise<SessionClaims | null> {
  const token = readCookie(
    request.headers.get('cookie'),
    SESSION_COOKIE_NAME,
  );
  return token ? verifySessionToken(token, secret) : null;
}

export function buildSessionCookie(
  token: string,
  maxAgeSeconds = SESSION_TTL_SECONDS,
): string {
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

export function buildExpiredSessionCookie(): string {
  return [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

function readCookie(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const pair of cookieHeader.split(';')) {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }
    const cookieName = pair.slice(0, separatorIndex).trim();
    if (cookieName === name) {
      return pair.slice(separatorIndex + 1).trim() || null;
    }
  }

  return null;
}

async function sign(
  value: string,
  secret: string,
): Promise<ArrayBuffer> {
  const key = await importHmacKey(secret, ['sign']);
  return crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  );
}

async function importHmacKey(
  secret: string,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    usages,
  );
}

function encodeBase64Url(
  value: ArrayBuffer | Uint8Array,
): string {
  const bytes =
    value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodeBase64Url(
  value: string,
): Uint8Array<ArrayBuffer> {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) =>
    character.charCodeAt(0),
  );
}

function decodeClaims(value: string): unknown {
  try {
    return JSON.parse(
      new TextDecoder().decode(decodeBase64Url(value)),
    ) as unknown;
  } catch {
    return null;
  }
}

function sessionClaimsAreValid(
  claims: unknown,
  nowSeconds: number,
): claims is SessionClaims {
  if (!claims || typeof claims !== 'object') {
    return false;
  }

  const candidate = claims as Partial<SessionClaims>;
  return (
    candidate.version === 1 &&
    candidate.role === 'editor' &&
    typeof candidate.sub === 'string' &&
    candidate.sub.length > 0 &&
    typeof candidate.email === 'string' &&
    candidate.email.length > 0 &&
    typeof candidate.issuedAt === 'number' &&
    candidate.issuedAt <= nowSeconds &&
    typeof candidate.expiresAt === 'number' &&
    candidate.expiresAt > nowSeconds
  );
}

function assertAuthBindings(bindings: AuthBindings): void {
  if (
    !bindings.GOOGLE_CLIENT_ID ||
    !bindings.AUTHORIZED_EDITOR_EMAILS
  ) {
    throw new ApiError(
      500,
      'AUTH_CONFIGURATION_ERROR',
      'Authentication is not configured correctly.',
    );
  }
  assertSessionSecret(bindings.SESSION_SECRET);
}

function assertSessionSecret(secret: string): void {
  if (new TextEncoder().encode(secret).byteLength < 32) {
    throw new ApiError(
      500,
      'AUTH_CONFIGURATION_ERROR',
      'Authentication is not configured correctly.',
    );
  }
}
