/**
 * Session cookie forge helper for E2E tests.
 *
 * Uses `iron-session` (v6) with the same seal options the SDK uses internally
 * to produce encrypted `fe_session` cookies that the middleware can decrypt.
 * JWTs are signed with a test RSA key pair — the corresponding public key
 * must be set as `FRONTEGG_JWT_PUBLIC_KEY` in the example app's env.
 *
 * This file intentionally does NOT import anything from `src/` — it reads the
 * encryption password from the environment and calls `sealData` directly.
 */

import { sealData } from 'iron-session';
import { SignJWT, importJWK } from 'jose';
import type { Cookie } from '@playwright/test';

// ---------------------------------------------------------------------------
// Test RSA key pair (2048-bit, generated for E2E tests only)
// ---------------------------------------------------------------------------

export const TEST_PUBLIC_JWK = {
  kty: 'RSA',
  n: 'lBbZk4BdWKe3aLYuTlhArlqooIklNzqsKP1IsLwxMY1x3dServG2TyFgl9O6uUVhccvim57moz3Qm0iVnRKBuSRXzWzCXKjoof1kZcJi9d5lPqWkR6aYjrEOhd13GhmpSWjneW5wOR-_M8-Sej2Bz5sP-ik6L7zz9h-iid4w5d6MbBxgWotk28tgR85HyPy9l5X5QZIOAAYW6rg5DanlnAzyQ4sDuJANBqFNrGNnkqyd-tzNp5kblf3ecpuWwe5sjvYR7tIMMHxnXtqSUs-Sq_ubr1ndtlCO5fokNJpg9j5XM2e6auynmBJLfjVKdmpudxabCaQ9DM651WKhKSX9AQ',
  e: 'AQAB',
  alg: 'RS256',
  use: 'sig',
};

const TEST_PRIVATE_JWK = {
  kty: 'RSA',
  n: 'lBbZk4BdWKe3aLYuTlhArlqooIklNzqsKP1IsLwxMY1x3dServG2TyFgl9O6uUVhccvim57moz3Qm0iVnRKBuSRXzWzCXKjoof1kZcJi9d5lPqWkR6aYjrEOhd13GhmpSWjneW5wOR-_M8-Sej2Bz5sP-ik6L7zz9h-iid4w5d6MbBxgWotk28tgR85HyPy9l5X5QZIOAAYW6rg5DanlnAzyQ4sDuJANBqFNrGNnkqyd-tzNp5kblf3ecpuWwe5sjvYR7tIMMHxnXtqSUs-Sq_ubr1ndtlCO5fokNJpg9j5XM2e6auynmBJLfjVKdmpudxabCaQ9DM651WKhKSX9AQ',
  e: 'AQAB',
  d: 'hHfsKQWqeqOMbR6KTYqkUVLHhNMpdz4EwqXPYEj3uFvOf6CyUcvmSOKShT3gydpGUIURMCP0LBIfiMhlDRyA7hyUbi3brwdpEX6ZUG2SGF3YMzH4wh9EWGAJnbV91Nsfk4tDhFxGBtNfNfl4DeD3Pb53jE9UvV9I2-Fwg-M92mDcsEqcMWXujU8E3kaP1ZViKRIpByMGPl2SFsrwlSa1fY9sOVu95-Rxo1aXbcEWCY-G6pNQvYXm3-MUcPal4FY-3hOXHI4DIy2-44y63E6tri-CnHAz6pi5-r3a2-iCS_91w4fsmYc2OF2w8pL3u7qTrlQC8Fo6yZsBo7nArMxx',
  p: 'yXOcBTVSfMx3AuOEB8yOG8c6b7TO-7uVwxEb7svdZB2UkqfgqGw26EC2MVM1vy8VS6xIrAhbLsi6RQ7FVxYUTt9qlMRIzbKD8umNebJ7XhX9mfR1J6hZa4ATpY0Gdfg_8ooFXl6iFHcCb8hMUajLFOiNzXqCOWCZVyOL6hrG4N0',
  q: 'vDA5mBauJZmuRtX8oj0bqezqRT9LZa9SWgygur7nAnQbrzhqrJwg24Q0osHf8mdW-FdoRijst9DakTKZyDwUHFbe0eqnSgPn0SswdPQhTBNZdjgn_lJhvQZa8SCTga4OUM5I_x2sCwa0SghWnwb5jaPhdhBnItFInsmdQ3bWmHU',
  dp: 'QH4fg9dXShbXPviBi1GkaSY2Ag8beKHMRz_R9ngTr3p81xqhpKnIRkB5U381JLi5E5nbRiACuQ6P-43IBaJO7BVAdNIGELxG29yDa2OFdVCK-N-3JfQSdITzRTvJxrisGESxhU28i9qx0AGK1VW5dj8hLpg62o2fabM6lr7tzo0',
  dq: 'vB3Y9Nd3Lc76D4VJDUTYqnxRkvc6f2NKhwmoggTjF-jI49cZi4JmtgjqNOho3P_ASG_XpIq0VutIEWzrnOWxlMKh6mUO5UYSLV1nCwIfZtTQ0QRBtlDTswjvT6qoyTEczlnnTl5y5HLHNlovfLiULapsboDnGD7swQ35Tr80tSE',
  qi: 'eAcGGGtZEn7y-fD5yPc1a0xquhPoPiylT5koSWYwB258K7dvvQQY3uKhbXGfbXSosCuEgJDrVmKmh2iUORcP_2uyCqCchwo5PtQpMRUdlv-5pp3o1CBOXZYpY-VDd3Fk6NFeUYYV2LWm5YaMkjqpsJBBeSrmmHIN7Y_SgchQF84',
  alg: 'RS256',
  use: 'sig',
};

// ---------------------------------------------------------------------------
// JWT builder
// ---------------------------------------------------------------------------

async function signMockJwt(payload: Record<string, unknown>, expiresAt: number): Promise<string> {
  const privateKey = await importJWK(TEST_PRIVATE_JWK, 'RS256');
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(privateKey);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ForgeSessionOptions {
  /** Override the JWT `sub` claim. Default: a fixed UUID. */
  sub?: string;
  /** Override the user email claim embedded in the JWT. */
  email?: string;
  /** Seconds until the JWT expires, relative to now. Default: 3600. */
  expiresInSeconds?: number;
  /** Explicit `exp` epoch seconds — overrides `expiresInSeconds`. */
  exp?: number;
  /** Tenant ID embedded in the JWT payload. */
  tenantId?: string;
  /** Roles array in the JWT. */
  roles?: string[];
  /** Permissions array in the JWT. */
  permissions?: string[];
  /** An explicit access token string (skips JWT generation). */
  accessToken?: string;
  /** Refresh token value. Default: 'mock-refresh-token'. */
  refreshToken?: string;
  /** iron-session seal TTL in seconds. Default: 86400 (24 h). */
  sealTtl?: number;
}

/**
 * Produce a `{ name, value, ... }` cookie object ready for Playwright's
 * `context.addCookies()`.
 *
 * The value is an iron-session sealed string that the SDK middleware can
 * unseal with `FRONTEGG_ENCRYPTION_PASSWORD`. The JWT inside is signed with
 * the test RSA key pair — the example app must have `FRONTEGG_JWT_PUBLIC_KEY`
 * set to `TEST_PUBLIC_JWK` for verification to succeed.
 */
export async function forgeSessionCookie(options: ForgeSessionOptions = {}): Promise<Cookie> {
  const {
    sub = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    email = 'mock-user@example.com',
    expiresInSeconds = 3600,
    exp,
    tenantId = 'tenant-mock',
    roles = ['Admin'],
    permissions = ['read', 'write'],
    refreshToken = 'mock-refresh-token',
    sealTtl = 86400,
  } = options;

  const expValue = exp ?? Math.floor(Date.now() / 1000) + expiresInSeconds;

  const accessToken =
    options.accessToken ??
    (await signMockJwt(
      {
        sub,
        email,
        name: 'Mock User',
        iss: 'frontegg-mock',
        aud: 'frontegg-mock',
        tenantId,
        roles,
        permissions,
      },
      expValue
    ));

  // The SDK seals `JSON.stringify({ accessToken, refreshToken })`.
  const dataToSeal = JSON.stringify({ accessToken, refreshToken });

  const encryptionPassword = process.env.FRONTEGG_ENCRYPTION_PASSWORD;
  if (!encryptionPassword) {
    throw new Error(
      'FRONTEGG_ENCRYPTION_PASSWORD env var is required to forge session cookies. ' +
        'Make sure .env.local is loaded (Playwright config calls dotenv).'
    );
  }

  // The SDK stores the password as a PasswordsMap: { "1": "<hex>" }.
  // iron-session v6 `sealData` accepts either a string or a map.
  const password: Record<string, string> = { 1: encryptionPassword };

  const sealed = await sealData(dataToSeal, { password, ttl: sealTtl });

  // Cookie name: the SDK uses `fe_session-<clientId_no_dashes>`.
  // Fall back to bare `fe_session` when FRONTEGG_CLIENT_ID isn't set.
  const clientId = process.env.FRONTEGG_CLIENT_ID ?? '';
  const cookieName = process.env.FRONTEGG_COOKIE_NAME
    ? clientId
      ? `${process.env.FRONTEGG_COOKIE_NAME}-${clientId.replace(/-/g, '')}`
      : process.env.FRONTEGG_COOKIE_NAME
    : clientId
      ? `fe_session-${clientId.replace(/-/g, '')}`
      : 'fe_session';

  return {
    name: cookieName,
    value: sealed,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    expires: -1,
  };
}

/**
 * Produce a session cookie whose JWT is already expired (exp in the past).
 * Useful for testing refresh flows — the middleware will detect the expired
 * token and attempt a refresh.
 */
export async function forgeExpiredSessionCookie(overrides: Partial<ForgeSessionOptions> = {}): Promise<Cookie> {
  return forgeSessionCookie({
    // Token expired 60 seconds ago
    exp: Math.floor(Date.now() / 1000) - 60,
    ...overrides,
  });
}

/**
 * Produce a session cookie whose JWT expires very soon (within 30 seconds).
 * The SDK considers a token "near-expiry" and will trigger a refresh.
 */
export async function forgeNearExpirySessionCookie(overrides: Partial<ForgeSessionOptions> = {}): Promise<Cookie> {
  return forgeSessionCookie({
    expiresInSeconds: 30,
    ...overrides,
  });
}
