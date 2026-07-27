import { beforeAll, describe, expect, it } from 'vitest';

import {
  verifyGoogleIdToken,
  type GoogleJwk,
} from '../googleIdentity';

const KEY_ID = 'test-google-key';
const CLIENT_ID = 'google-client-id.apps.googleusercontent.com';
const NOW = 2_000_000_000;

let privateKey: CryptoKey;
let publicJwk: GoogleJwk;

beforeAll(async () => {
  const keyPair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  privateKey = keyPair.privateKey;
  publicJwk = await crypto.subtle.exportKey(
    'jwk',
    keyPair.publicKey,
  );
  publicJwk.kid = KEY_ID;
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';
});

describe('Google ID token verification', () => {
  it('validates the signature and required Google claims', async () => {
    const token = await signGoogleToken({
      aud: CLIENT_ID,
      email: 'vic@example.com',
      email_verified: true,
      exp: NOW + 600,
      iss: 'https://accounts.google.com',
      name: 'Vic',
      sub: 'subject-1',
    });

    await expect(
      verifyGoogleIdToken(token, CLIENT_ID, {
        jwks: [publicJwk],
        nowSeconds: NOW,
      }),
    ).resolves.toEqual({
      sub: 'subject-1',
      email: 'vic@example.com',
      name: 'Vic',
      picture: undefined,
    });
  });

  it.each([
    ['wrong audience', { aud: 'another-client' }],
    ['expired token', { exp: NOW }],
    ['unverified email', { email_verified: false }],
    ['wrong issuer', { iss: 'https://attacker.example' }],
  ])('rejects a token with %s', async (_label, override) => {
    const token = await signGoogleToken({
      aud: CLIENT_ID,
      email: 'vic@example.com',
      email_verified: true,
      exp: NOW + 600,
      iss: 'accounts.google.com',
      sub: 'subject-1',
      ...override,
    });

    await expect(
      verifyGoogleIdToken(token, CLIENT_ID, {
        jwks: [publicJwk],
        nowSeconds: NOW,
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_GOOGLE_CREDENTIAL',
    });
  });

  it('rejects a token signed by a different key', async () => {
    const otherKeys = (await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair;
    const token = await signGoogleToken(
      {
        aud: CLIENT_ID,
        email: 'vic@example.com',
        email_verified: true,
        exp: NOW + 600,
        iss: 'accounts.google.com',
        sub: 'subject-1',
      },
      otherKeys.privateKey,
    );

    await expect(
      verifyGoogleIdToken(token, CLIENT_ID, {
        jwks: [publicJwk],
        nowSeconds: NOW,
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_GOOGLE_CREDENTIAL',
    });
  });
});

async function signGoogleToken(
  claims: Record<string, unknown>,
  signingKey = privateKey,
): Promise<string> {
  const header = encodeJson({ alg: 'RS256', kid: KEY_ID, typ: 'JWT' });
  const payload = encodeJson(claims);
  const input = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    signingKey,
    new TextEncoder().encode(input),
  );

  return `${input}.${encodeBase64Url(new Uint8Array(signature))}`;
}

function encodeJson(value: unknown): string {
  return encodeBase64Url(
    new TextEncoder().encode(JSON.stringify(value)),
  );
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
