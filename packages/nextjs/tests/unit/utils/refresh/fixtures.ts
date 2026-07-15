import { IncomingMessage, ServerResponse } from 'http';
import { vi } from 'vitest';

/**
 * Shared fixtures for refreshAccessTokenIfNeeded unit tests.
 */

export type MockConfigOverrides = Partial<{
  cookieName: string;
  cookieDomain: string;
  cookieSameSite: 'lax' | 'strict' | 'none';
  clientId: string;
  clientSecret: string;
  appId: string | undefined;
  rewriteCookieByAppId: boolean;
  baseUrlHost: string;
  isSSL: boolean;
  isHostedLogin: boolean;
  disableInitialPropsRefreshToken: boolean;
  shouldForwardIp: boolean;
  sharedSecret: string | undefined;
  secureJwtEnabled: boolean;
}>;

/** Baseline config used by vi.mock factories. */
export const FRONTEGG_CONFIG_BASE = {
  cookieName: 'fe_session',
  cookieDomain: 'example.com',
  cookieSameSite: 'none' as const,
  clientId: 'abc-def-ghi',
  clientSecret: 'super-secret',
  appId: undefined as string | undefined,
  rewriteCookieByAppId: false,
  baseUrlHost: 'frontegg.example.com',
  isSSL: true,
  isHostedLogin: false,
  disableInitialPropsRefreshToken: false,
  shouldForwardIp: false,
  sharedSecret: 'shh',
  secureJwtEnabled: false,
};

export const mockConfig = (overrides: MockConfigOverrides = {}) => ({
  ...FRONTEGG_CONFIG_BASE,
  ...overrides,
});

/** Build a fake JWT (header.payload.signature) and return string + decoded. */
export const mockJwt = (
  payload: Record<string, any> = {}
): { token: string; decoded: { sub: string; exp: number; [k: string]: any } } => {
  const decoded = {
    sub: 'user-123',
    exp: Math.floor(Date.now() / 1000) + 3600,
    name: 'Test User',
    email: 'test@example.com',
    ...payload,
  };
  const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(decoded)}.signature`;
  return { token, decoded };
};

export type MockNextPageContextOpts = {
  url?: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
  sessionCookieInResponse?: string | string[];
  remoteAddress?: string;
  pathname?: string;
};

/**
 * Build a fake NextPageContext with req/res/pathname.
 * The req contains cookies + headers, the res records setHeader/getHeader.
 */
export const mockNextPageContext = (opts: MockNextPageContextOpts = {}) => {
  const { url = '/', cookies = {}, headers = {}, sessionCookieInResponse, remoteAddress, pathname = '/' } = opts;

  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  const reqHeaders: Record<string, any> = { ...headers };
  if (cookieHeader) reqHeaders.cookie = cookieHeader;

  const req = {
    url,
    headers: reqHeaders,
    cookies,
    socket: { remoteAddress },
  } as unknown as IncomingMessage;

  const responseHeaders: Record<string, string | string[] | undefined> = {};
  if (sessionCookieInResponse !== undefined) {
    responseHeaders['set-cookie'] = sessionCookieInResponse;
  }

  const res = {
    getHeader: vi.fn((name: string) => responseHeaders[name.toLowerCase()]),
    setHeader: vi.fn((name: string, value: string | string[]) => {
      responseHeaders[name.toLowerCase()] = value;
      return res;
    }),
    removeHeader: vi.fn((name: string) => {
      delete responseHeaders[name.toLowerCase()];
    }),
    hasHeader: vi.fn((name: string) => responseHeaders[name.toLowerCase()] !== undefined),
  } as unknown as ServerResponse & {
    getHeader: ReturnType<typeof vi.fn>;
    setHeader: ReturnType<typeof vi.fn>;
  };

  return { req, res, pathname };
};

export type MockRefreshResponseOpts = {
  ok?: boolean;
  status?: number;
  accessToken?: string;
  refreshToken?: string;
  setCookieHeaders?: string[];
  /**
   * Which Set-Cookie API surface to expose:
   *  - 'raw'          → headers.raw()['set-cookie'] (Next < 13.4)
   *  - 'getSetCookie' → headers.getSetCookie() (Next >= 13.4)
   *  - 'get'          → headers.get('set-cookie') (single string)
   *  - 'none'         → none, returns []
   */
  setCookieFormat?: 'raw' | 'getSetCookie' | 'get' | 'none';
  jsonBody?: any;
};

/** Build a fake Response-like object for refresh-token API responses. */
export const mockRefreshResponse = (opts: MockRefreshResponseOpts = {}): Response => {
  const {
    ok = true,
    status = 200,
    accessToken = 'access-token-value',
    refreshToken = 'refresh-token-value',
    setCookieHeaders = ['fe_session_other=foo; Path=/; HttpOnly'],
    setCookieFormat = 'getSetCookie',
    jsonBody,
  } = opts;

  const body = jsonBody ?? { accessToken, refreshToken };

  const headers: any = {};
  if (setCookieFormat === 'raw') {
    headers.raw = vi.fn(() => ({ 'set-cookie': setCookieHeaders }));
  } else if (setCookieFormat === 'getSetCookie') {
    headers.getSetCookie = vi.fn(() => setCookieHeaders);
  } else if (setCookieFormat === 'get') {
    headers.get = vi.fn((name: string) => (name.toLowerCase() === 'set-cookie' ? setCookieHeaders.join(', ') : null));
  }

  return {
    ok,
    status,
    headers,
    json: vi.fn(async () => body),
  } as unknown as Response;
};
