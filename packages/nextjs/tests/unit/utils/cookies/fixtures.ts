import { IncomingMessage, ServerResponse } from 'http';
import { vi } from 'vitest';

/**
 * Shared fixtures for cookie unit tests.
 */

/** A small seal value that fits in a single cookie. */
export const SMALL_SEAL = 'small-seal-value';

/** A ~3 kB fake seal string (still fits in a single cookie). */
export const MEDIUM_SEAL = 'x'.repeat(3 * 1024);

/**
 * A ~9 kB fake seal that forces chunking into multiple cookies.
 * COOKIE_MAX_LENGTH is 4000, so a single cookie cannot carry this.
 */
export const LARGE_SEAL = 'y'.repeat(9 * 1024);

/** Realistic Frontegg-style seal fixture used by the legacy Playwright spec. */
export const LEGACY_LARGE_SEAL =
  'Fe262*1*4cd7dffc4d52f6a9e67268eb59b6107aaf20d68fa27d044b473bfe9d317e9f68*' +
  'hEqJ99Zz6de46d8LGS-U3A*' +
  'a'.repeat(7500) +
  '*3344517377856*xyz~2';

export type MockConfigOverrides = Partial<{
  cookieName: string;
  cookieDomain: string;
  cookieSameSite: 'lax' | 'strict' | 'none';
  clientId: string;
  appId: string | undefined;
  rewriteCookieByAppId: boolean;
  baseUrlHost: string;
  isSSL: boolean;
}>;

/**
 * Build a mock config object suitable for `vi.mock('../../src/config', ...)`.
 * Returns a plain object (NOT the live config class). Tests can override any
 * property per-suite.
 */
export const mockConfig = (overrides: MockConfigOverrides = {}) => ({
  cookieName: 'fe_session',
  cookieDomain: 'example.com',
  cookieSameSite: 'none' as const,
  clientId: 'abc-def-ghi',
  appId: undefined as string | undefined,
  rewriteCookieByAppId: false,
  baseUrlHost: 'frontegg.example.com',
  isSSL: true,
  ...overrides,
});

/**
 * Build a fake IncomingMessage with a cookie header.
 * Accepts either a pre-built cookie string or a key/value record.
 */
export const mockIncomingMessage = (cookies: Record<string, string> | string): IncomingMessage => {
  const cookieHeader =
    typeof cookies === 'string'
      ? cookies
      : Object.entries(cookies)
          .map(([k, v]) => `${k}=${v}`)
          .join('; ');

  return {
    headers: {
      cookie: cookieHeader || undefined,
    },
  } as unknown as IncomingMessage;
};

/** Build a fake Fetch-style Request with a cookie header. */
export const mockFetchRequest = (cookies: Record<string, string> | string): Request => {
  const cookieHeader =
    typeof cookies === 'string'
      ? cookies
      : Object.entries(cookies)
          .map(([k, v]) => `${k}=${v}`)
          .join('; ');
  const headers = new Headers();
  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }
  // minimal shape to satisfy `'credentials' in request` branch
  return {
    credentials: 'include',
    headers,
  } as unknown as Request;
};

/**
 * Build a minimal ServerResponse mock that records setHeader/getHeader calls
 * and behaves like a real ServerResponse for header storage.
 */
export const mockServerResponse = (initialHeaders: Record<string, string | string[]> = {}) => {
  const headers: Record<string, string | string[] | undefined> = { ...initialHeaders };
  const res = {
    getHeader: vi.fn((name: string) => headers[name.toLowerCase()]),
    setHeader: vi.fn((name: string, value: string | string[]) => {
      headers[name.toLowerCase()] = value;
      return res;
    }),
    removeHeader: vi.fn((name: string) => {
      delete headers[name.toLowerCase()];
    }),
    hasHeader: vi.fn((name: string) => headers[name.toLowerCase()] !== undefined),
  };
  return res as unknown as ServerResponse & {
    getHeader: ReturnType<typeof vi.fn>;
    setHeader: ReturnType<typeof vi.fn>;
  };
};

/** Helper to extract `name=value` from a serialized Set-Cookie string. */
export const extractCookieValue = (cookie: string, cookieName: string): string | undefined => {
  const parts = cookie.split('; ');
  const entry = parts.find((p) => p.startsWith(`${cookieName}=`));
  return entry?.split('=')[1];
};
