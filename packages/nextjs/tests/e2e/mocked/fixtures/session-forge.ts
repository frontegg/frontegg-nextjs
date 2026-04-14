/**
 * Session cookie forge helper for E2E tests.
 *
 * Uses `iron-session` (v6) with the same seal options the SDK uses internally
 * to produce encrypted `fe_session` cookies that the middleware can decrypt.
 *
 * This file intentionally does NOT import anything from `src/` — it reads the
 * encryption password from the environment and calls `sealData` directly.
 */

import { sealData } from 'iron-session';
import type { Cookie } from '@playwright/test';

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

/** Base64url-encode a Buffer or string. */
function base64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

/** Build a minimal HS256-shaped JWT (not cryptographically signed — the
 *  middleware only decodes the payload after unsealing the cookie, it does
 *  NOT verify the JWT signature when using the default non-secure mode). */
function buildMockJwt(payload: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.mock-signature`;
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
 * unseal with `FRONTEGG_ENCRYPTION_PASSWORD`.
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
    buildMockJwt({
      sub,
      email,
      name: 'Mock User',
      iss: 'frontegg-mock',
      aud: 'frontegg-mock',
      iat: Math.floor(Date.now() / 1000),
      exp: expValue,
      tenantId,
      roles,
      permissions,
    });

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
