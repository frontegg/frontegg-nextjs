import { describe, it, expect, vi, beforeEach } from 'vitest';

const CONFIG_BASE = vi.hoisted(() => ({
  appUrl: 'https://app.example.com',
  authRoutes: {} as Record<string, string>,
  secureJwtEnabled: true,
  hostedLoginCallbackOnAppUrl: false,
  clientId: 'abc-def-ghi',
  clientSecret: 'super-secret',
  shouldForwardIp: false,
  sharedSecret: undefined as string | undefined,
  isSSL: true,
  rewriteCookieByAppId: false,
  appId: undefined as string | undefined,
  cookieName: 'fe_session',
  cookieDomain: 'app.example.com',
  cookieSameSite: 'none' as const,
}));

const logger = vi.hoisted(() => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }));

vi.mock('../../../src/utils/fronteggLogger', () => ({ default: { child: () => logger } }));
vi.mock('../../../src/config', () => ({ default: { ...CONFIG_BASE } }));
vi.mock('../../../src/api', () => ({ default: { exchangeHostedLoginToken: vi.fn() } }));
vi.mock('../../../src/utils/encryption-edge', () => ({ default: { sealTokens: vi.fn() } }));
vi.mock('../../../src/utils/jwt', () => ({ default: { verify: vi.fn() } }));
vi.mock('../../../src/utils/createSession', () => ({ default: vi.fn(async () => undefined) }));
vi.mock('../../../src/edge/refreshAccessTokenIfNeededOnEdge', () => ({
  refreshAccessTokenIfNeededOnEdge: vi.fn(async () => undefined),
}));

import config from '../../../src/config';
import api from '../../../src/api';
import JwtManager from '../../../src/utils/jwt';
import encryptionEdge from '../../../src/utils/encryption-edge';
import createSession from '../../../src/utils/createSession';
import { refreshAccessTokenIfNeededOnEdge } from '../../../src/edge/refreshAccessTokenIfNeededOnEdge';
import {
  checkSessionOnEdge,
  getSessionOnEdge,
  handleHostedLoginCallback,
  handleSessionOnEdge,
} from '../../../src/edge';

const mockedExchange = vi.mocked(api.exchangeHostedLoginToken);
const mockedVerify = vi.mocked(JwtManager.verify);
const mockedSeal = vi.mocked(encryptionEdge.sealTokens);
const mockedCreateSession = vi.mocked(createSession);
const mockedRefresh = vi.mocked(refreshAccessTokenIfNeededOnEdge);

const SESSION = { accessToken: 'a', refreshToken: 'r', user: { sub: 'u' } } as any;
const EXP = Math.floor(Date.now() / 1000) + 3600;

const run = (pathname: string, qs = '', init?: RequestInit) => {
  const request = new Request(`https://app.example.com${pathname}${qs ? `?${qs}` : ''}`, init);
  return handleSessionOnEdge({
    request,
    pathname,
    searchParams: new URLSearchParams(qs),
    headers: request.headers as any,
  });
};

const mockExchange = (data: Record<string, any>, sealed = 'sealed-session') => {
  mockedExchange.mockResolvedValue({ json: async () => data } as any);
  mockedVerify.mockResolvedValue({ payload: { exp: EXP } } as any);
  mockedSeal.mockResolvedValue(sealed as any);
};

const setCookies = (response: Response): string[] => (response.headers as any).getSetCookie();

beforeEach(() => {
  Object.assign(config, CONFIG_BASE);
  mockedCreateSession.mockResolvedValue(undefined);
  mockedRefresh.mockResolvedValue(undefined);
});

describe('handleSessionOnEdge', () => {
  it('lets static assets through without checking the session', async () => {
    // Act
    const response = await run('/_next/static/chunk.js');

    // Assert
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(mockedCreateSession).not.toHaveBeenCalled();
  });

  it('redirects to login with the original path when there is no session', async () => {
    // Act
    const response = await run('/dashboard', 'tab=1');

    // Assert
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/account/login');
    expect(location.searchParams.get('redirectUrl')).toBe('/dashboard');
    expect(location.searchParams.get('tab')).toBe('1');
  });

  it('redirects to login and clears cookies when the refresh is rejected', async () => {
    // Arrange: refreshAccessTokenIfNeededOnEdge returns removal cookies but no session
    mockedRefresh.mockResolvedValue({
      session: undefined,
      headers: { 'set-cookie': 'fe_session=; Max-Age=0, fe_refresh_abc=; Max-Age=0' },
    });

    // Act
    const response = await run('/dashboard', 'tab=1');

    // Assert
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/account/login');
    expect(location.searchParams.get('redirectUrl')).toBe('/dashboard');
    expect(response.headers.get('x-middleware-next')).toBeNull();
    expect(response.headers.get('set-cookie')).toBe('fe_session=; Max-Age=0, fe_refresh_abc=; Max-Age=0');
  });

  it('continues when the session cookie holds a valid session', async () => {
    mockedCreateSession.mockResolvedValue(SESSION);

    const response = await run('/dashboard');

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(mockedRefresh).not.toHaveBeenCalled();
  });

  it('continues without extra headers when a refresh returns a session only', async () => {
    mockedRefresh.mockResolvedValue({ session: SESSION });

    const response = await run('/dashboard');

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('forwards refreshed cookies to the response and the downstream request', async () => {
    // Arrange
    const headers = new Headers([['set-cookie', 'fe_session=new']]);
    const forwardedHeaders = new Headers({ cookie: 'fe_session=new' });
    mockedRefresh.mockResolvedValue({ session: SESSION, headers, forwardedHeaders } as any);

    // Act
    const response = await run('/dashboard');

    // Assert
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('set-cookie')).toBe('fe_session=new');
    expect(response.headers.get('x-middleware-request-cookie')).toBe('fe_session=new');
  });

  it('exchanges a hosted login callback code before any other handling', async () => {
    mockExchange({ access_token: 'access', refresh_token: 'refresh' });

    const response = await run('/oauth/callback', 'code=abc');

    expect(mockedExchange.mock.calls[0][1]).toBe('abc');
    expect(response.headers.get('location')).toBe('https://app.example.com/');
    expect(mockedCreateSession).not.toHaveBeenCalled();
  });
});

describe('handleHostedLoginCallback', () => {
  it('continues untouched when the request is not a callback', async () => {
    const request = new Request('https://app.example.com/dashboard');

    const response = await handleHostedLoginCallback(request, '/dashboard', new URLSearchParams());

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(mockedExchange).not.toHaveBeenCalled();
  });

  it('exchanges the code with the client credentials and sets session and refresh cookies', async () => {
    // Arrange
    mockExchange({ accessToken: 'access', refreshToken: 'refresh' });
    const request = new Request('https://app.example.com/oauth/callback?code=xyz');

    // Act
    const response = await handleHostedLoginCallback(request, '/oauth/callback', new URLSearchParams('code=xyz'));

    // Assert
    const [headers, code, clientId, clientSecret, redirectUri] = mockedExchange.mock.calls[0];
    expect(code).toBe('xyz');
    expect(clientId).toBe('abc-def-ghi');
    expect(clientSecret).toBe('super-secret');
    expect(redirectUri).toBeUndefined();
    expect(headers['x-frontegg-forwarded-for']).toBeUndefined();
    expect(mockedVerify).toHaveBeenCalledWith('access');
    expect(mockedSeal).toHaveBeenCalledWith({ accessToken: 'access', refreshToken: 'refresh' }, EXP);
    expect(response.status).toBe(307);
    const cookies = setCookies(response);
    expect(cookies.some((c) => c.startsWith('fe_session=sealed-session'))).toBe(true);
    expect(cookies.some((c) => c.startsWith('fe_refresh_abcdef-ghi=refresh'))).toBe(true);
  });

  it('names the refresh cookie after the app id when rewriting cookies by app id', async () => {
    Object.assign(config, { rewriteCookieByAppId: true, appId: 'app-id-1' });
    mockExchange({ access_token: 'access', refresh_token: 'refresh' });
    const request = new Request('https://app.example.com/oauth/callback?code=xyz');

    const response = await handleHostedLoginCallback(request, '/oauth/callback', new URLSearchParams('code=xyz'));

    expect(setCookies(response).some((c) => c.startsWith('fe_refresh_appid-1=refresh'))).toBe(true);
  });

  it('writes an empty refresh cookie when the exchange returns no refresh token', async () => {
    mockExchange({ access_token: 'access' });
    const request = new Request('https://app.example.com/oauth/callback?code=xyz');

    const response = await handleHostedLoginCallback(request, '/oauth/callback', new URLSearchParams('code=xyz'));

    expect(setCookies(response).some((c) => c.startsWith('fe_refresh_abcdef-ghi=;'))).toBe(true);
  });

  it('redirects to the app without cookies when no session could be sealed', async () => {
    mockExchange({ access_token: 'access' }, '');
    const request = new Request('https://app.example.com/oauth/callback?code=xyz');

    const response = await handleHostedLoginCallback(request, '/oauth/callback', new URLSearchParams('code=xyz'));

    expect(response.headers.get('location')).toBe('https://app.example.com/');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('forwards the cloudflare client ip of a fetch request when ip forwarding is enabled', async () => {
    // Arrange
    Object.assign(config, { shouldForwardIp: true, sharedSecret: 'shh' });
    mockExchange({ access_token: 'access' });
    const request = new Request('https://app.example.com/oauth/callback?code=xyz', {
      headers: { 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' },
    });

    // Act
    await handleHostedLoginCallback(request, '/oauth/callback', new URLSearchParams('code=xyz'));

    // Assert
    const headers = mockedExchange.mock.calls[0][0];
    expect(headers['x-frontegg-forwarded-for']).toBe('1.1.1.1');
    expect(headers['x-frontegg-headers-verifier']).toBe('shh');
    expect(headers['frontegg-vendor-id']).toBe('abc-def-ghi');
  });

  it('forwards the first x-forwarded-for ip of a node request with an empty verifier by default', async () => {
    Object.assign(config, { shouldForwardIp: true });
    mockExchange({ access_token: 'access' });
    const request = { headers: { 'x-forwarded-for': '3.3.3.3, 4.4.4.4' } } as any;

    await handleHostedLoginCallback(request, '/oauth/callback', new URLSearchParams('code=xyz'));

    const headers = mockedExchange.mock.calls[0][0];
    expect(headers['x-frontegg-forwarded-for']).toBe('3.3.3.3');
    expect(headers['x-frontegg-headers-verifier']).toBe('');
  });

  it('falls back to the socket address of a node request without proxy headers', async () => {
    Object.assign(config, { shouldForwardIp: true });
    mockExchange({ access_token: 'access' });
    const request = { headers: {}, socket: { remoteAddress: '5.5.5.5' } } as any;

    await handleHostedLoginCallback(request, '/oauth/callback', new URLSearchParams('code=xyz'));

    expect(mockedExchange.mock.calls[0][0]['x-frontegg-forwarded-for']).toBe('5.5.5.5');
  });

  it('falls back to the socket address of a fetch request without proxy headers', async () => {
    Object.assign(config, { shouldForwardIp: true });
    mockExchange({ access_token: 'access' });
    const request = Object.assign(new Request('https://app.example.com/oauth/callback?code=xyz'), {
      socket: { remoteAddress: '6.6.6.6' },
    });

    await handleHostedLoginCallback(request, '/oauth/callback', new URLSearchParams('code=xyz'));

    expect(mockedExchange.mock.calls[0][0]['x-frontegg-forwarded-for']).toBe('6.6.6.6');
  });

  it('does not forward the ip when forwarding is disabled', async () => {
    mockExchange({ access_token: 'access' });
    const request = { headers: { 'x-forwarded-for': '3.3.3.3' } } as any;

    await handleHostedLoginCallback(request, '/oauth/callback', new URLSearchParams('code=xyz'));

    expect(mockedExchange.mock.calls[0][0]['x-frontegg-forwarded-for']).toBeUndefined();
  });

  it('propagates a failed token verification on the callback route', async () => {
    mockedExchange.mockResolvedValue({ json: async () => ({}) } as any);
    mockedVerify.mockRejectedValue(new Error('invalid'));
    const request = new Request('https://app.example.com/oauth/callback?code=xyz');

    await expect(
      handleHostedLoginCallback(request, '/oauth/callback', new URLSearchParams('code=xyz'))
    ).rejects.toThrow('invalid');
  });
});

describe('checkSessionOnEdge', () => {
  it('returns the cookie session without refreshing', async () => {
    mockedCreateSession.mockResolvedValue(SESSION);
    const request = new Request('https://app.example.com/', { headers: { cookie: 'theme=dark; fe_session=sealed' } });

    const result = await checkSessionOnEdge(request);

    expect(mockedCreateSession).toHaveBeenCalledWith('sealed', encryptionEdge);
    expect(result).toEqual({ session: SESSION });
    expect(mockedRefresh).not.toHaveBeenCalled();
  });

  it('falls back to refreshing the token when the cookie has no session', async () => {
    const request = new Request('https://app.example.com/');
    const refreshed = { session: SESSION, headers: new Headers() };
    mockedRefresh.mockResolvedValue(refreshed as any);

    const result = await checkSessionOnEdge(request);

    expect(mockedRefresh).toHaveBeenCalledWith(request);
    expect(result).toBe(refreshed);
  });
});

describe('getSessionOnEdge', () => {
  it('resolves the session from the request cookie and logs a deprecation notice', async () => {
    mockedCreateSession.mockResolvedValue(SESSION);
    const request = new Request('https://app.example.com/', {
      headers: { cookie: 'fe_session-1=part1; fe_session-2=part2' },
    });

    const session = await getSessionOnEdge(request);

    expect(mockedCreateSession).toHaveBeenCalledWith('part1part2', encryptionEdge);
    expect(session).toBe(SESSION);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Deprecation Notice'));
  });

  it('skips the deprecation notice when warnings are disabled', async () => {
    await getSessionOnEdge(new Request('https://app.example.com/'), true);

    expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Deprecation Notice'));
  });
});
