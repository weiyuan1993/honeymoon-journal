import type { GoogleIdentity } from './contracts';
import { ApiError } from './http';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = new Set([
  'accounts.google.com',
  'https://accounts.google.com',
]);
const DEFAULT_JWKS_TTL_SECONDS = 300;

interface GoogleTokenHeader {
  alg?: string;
  kid?: string;
}

interface GoogleTokenClaims {
  aud?: string | string[];
  email?: string;
  email_verified?: boolean;
  exp?: number;
  iss?: string;
  name?: string;
  nbf?: number;
  picture?: string;
  sub?: string;
}

interface GoogleJwksResponse {
  keys?: GoogleJwk[];
}

interface CachedJwks {
  expiresAt: number;
  keys: GoogleJwk[];
}

export interface GoogleJwk extends JsonWebKey {
  alg?: string;
  kid?: string;
  use?: string;
}

export interface GoogleIdentityVerificationOptions {
  fetchImpl?: typeof fetch;
  jwks?: GoogleJwk[];
  jwksUrl?: string;
  nowSeconds?: number;
}

let cachedJwks: CachedJwks | null = null;

export async function verifyGoogleIdToken(
  credential: string,
  clientId: string,
  options: GoogleIdentityVerificationOptions = {},
): Promise<GoogleIdentity> {
  const [encodedHeader, encodedClaims, encodedSignature, extra] =
    credential.split('.');

  if (
    !encodedHeader ||
    !encodedClaims ||
    !encodedSignature ||
    extra !== undefined
  ) {
    throw invalidCredential();
  }

  const header = decodeJson<GoogleTokenHeader>(encodedHeader);
  const claims = decodeJson<GoogleTokenClaims>(encodedClaims);

  if (header.alg !== 'RS256' || !header.kid) {
    throw invalidCredential();
  }

  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  let keys =
    options.jwks ??
    (await loadGoogleJwks(
      options.fetchImpl ?? fetch,
      options.jwksUrl ?? GOOGLE_JWKS_URL,
      nowSeconds,
    ));
  let jwk = keys.find((candidate) => candidate.kid === header.kid);

  if (!jwk && !options.jwks) {
    keys = await loadGoogleJwks(
      options.fetchImpl ?? fetch,
      options.jwksUrl ?? GOOGLE_JWKS_URL,
      nowSeconds,
      true,
    );
    jwk = keys.find((candidate) => candidate.kid === header.kid);
  }

  if (!jwk) {
    throw invalidCredential();
  }

  const key = await importGoogleVerificationKey(jwk);
  const signature = decodeBase64Url(encodedSignature);
  const signingInput = new TextEncoder().encode(
    `${encodedHeader}.${encodedClaims}`,
  );
  const signatureIsValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    signature,
    signingInput,
  );

  if (!signatureIsValid || !claimsAreValid(claims, clientId, nowSeconds)) {
    throw invalidCredential();
  }

  return {
    sub: claims.sub as string,
    email: claims.email as string,
    name: claims.name,
    picture: claims.picture,
  };
}

async function loadGoogleJwks(
  fetchImpl: typeof fetch,
  jwksUrl: string,
  nowSeconds: number,
  forceRefresh = false,
): Promise<GoogleJwk[]> {
  if (
    !forceRefresh &&
    cachedJwks &&
    cachedJwks.expiresAt > nowSeconds
  ) {
    return cachedJwks.keys;
  }

  let response: Response;
  try {
    response = await fetchImpl(jwksUrl);
  } catch (error) {
    throw identityServiceUnavailable(error);
  }

  if (!response.ok) {
    throw identityServiceUnavailable();
  }

  let payload: GoogleJwksResponse;
  try {
    payload = (await response.json()) as GoogleJwksResponse;
  } catch (error) {
    throw identityServiceUnavailable(error);
  }

  if (!payload.keys?.length) {
    throw identityServiceUnavailable();
  }

  const maxAge = parseMaxAge(response.headers.get('cache-control'));
  cachedJwks = {
    keys: payload.keys,
    expiresAt:
      nowSeconds + (maxAge ?? DEFAULT_JWKS_TTL_SECONDS),
  };

  return payload.keys;
}

function claimsAreValid(
  claims: GoogleTokenClaims,
  clientId: string,
  nowSeconds: number,
): boolean {
  const audiences = Array.isArray(claims.aud)
    ? claims.aud
    : [claims.aud];

  return (
    audiences.includes(clientId) &&
    typeof claims.iss === 'string' &&
    GOOGLE_ISSUERS.has(claims.iss) &&
    typeof claims.exp === 'number' &&
    claims.exp > nowSeconds &&
    (claims.nbf === undefined ||
      (typeof claims.nbf === 'number' && claims.nbf <= nowSeconds)) &&
    claims.email_verified === true &&
    typeof claims.email === 'string' &&
    claims.email.length > 0 &&
    typeof claims.sub === 'string' &&
    claims.sub.length > 0
  );
}

async function importGoogleVerificationKey(
  jwk: GoogleJwk,
): Promise<CryptoKey> {
  try {
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify'],
    );
  } catch {
    throw invalidCredential();
  }
}

function decodeJson<T>(value: string): T {
  try {
    return JSON.parse(
      new TextDecoder().decode(decodeBase64Url(value)),
    ) as T;
  } catch {
    throw invalidCredential();
  }
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  try {
    const padded = value
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
  } catch {
    throw invalidCredential();
  }
}

function parseMaxAge(cacheControl: string | null): number | null {
  const match = cacheControl?.match(
    /(?:^|,)\s*max-age=(\d+)(?:,|$)/i,
  );
  return match ? Number(match[1]) : null;
}

function invalidCredential(): ApiError {
  return new ApiError(
    401,
    'INVALID_GOOGLE_CREDENTIAL',
    'Google sign-in could not be verified.',
  );
}

function identityServiceUnavailable(cause?: unknown): ApiError {
  return new ApiError(
    503,
    'IDENTITY_SERVICE_UNAVAILABLE',
    'Google sign-in is temporarily unavailable.',
    { retryable: true, cause },
  );
}
