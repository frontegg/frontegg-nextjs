import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  config: {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    isHostedLogin: false,
    isSSL: true,
    cookieDomain: 'localhost',
  },
  api: {
    refreshTokenHostedLogin: vi.fn(),
    refreshTokenEmbedded: vi.fn(),
  },
  cookieManager: {
    getRefreshCookieFromRequestEdge: vi.fn(),
    getRequestCookiesHeaderToRemove: vi.fn(),
    modifySetCookie: vi.fn((cookies: string[]) => cookies),
    create: vi.fn(),
  },
  jwtVerify: vi.fn(),
  sealTokens: vi.fn(),
}));

vi.mock('../../../src/config', () => ({ default: mocks.config }));
vi.mock('../../../src/api', () => ({ default: mocks.api }));
vi.mock('../../../src/utils/cookies', () => ({ default: mocks.cookieManager }));
vi.mock('../../../src/utils/jwt', () => ({ default: { verify: mocks.jwtVerify } }));
vi.mock('../../../src/utils/encryption-edge', () => ({ default: { sealTokens: mocks.sealTokens } }));

import {
  refreshAccessTokenIfNeededOnEdge,
  createSessionFromAccessTokenOnEdge,
  mergeSetCookiesIntoCookieHeader,
} from '../../../src/edge/refreshAccessTokenIfNeededOnEdge';

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600;

function buildRequest(cookieHeader?: string): Request {
  const headers = new Headers({ host: 'localhost:3000' });
  if (cookieHeader) headers.set('cookie', cookieHeader);
  return new Request('http://localhost:3000/', { headers });
}

function okRefreshResponse(setCookies: string[] = []): Response {
  const headers = new Headers();
  setCookies.forEach((c) => headers.append('set-cookie', c));
  return new Response(JSON.stringify({ accessToken: 'new-access', refreshToken: 'new-refresh' }), {
    status: 200,
    headers,
  });
}

beforeEach(() => {
  mocks.config.isHostedLogin = false;
  // like the real implementation, return a new array (the unit appends the session cookies to it)
  mocks.cookieManager.modifySetCookie.mockImplementation((cookies: string[]) => [...cookies]);
  mocks.cookieManager.getRefreshCookieFromRequestEdge.mockReturnValue('old-refresh');
  mocks.jwtVerify.mockResolvedValue({ payload: { sub: 'user-1', exp: FUTURE_EXP } });
  mocks.sealTokens.mockResolvedValue('sealed-session');
});

describe('mergeSetCookiesIntoCookieHeader', () => {
  it('keeps unrelated request cookies and appends new ones', () => {
    const result = mergeSetCookiesIntoCookieHeader('theme=dark; locale=en', ['fe_session=abc; Path=/; HttpOnly']);

    expect(result).toBe('theme=dark; locale=en; fe_session=abc');
  });

  it('replaces the value of a cookie that is refreshed', () => {
    const result = mergeSetCookiesIntoCookieHeader('fe_session=old; theme=dark', ['fe_session=new; Path=/']);

    expect(result).toBe('fe_session=new; theme=dark');
  });

  it('removes cookies that are cleared with an empty value', () => {
    const result = mergeSetCookiesIntoCookieHeader('fe_session-1=a; fe_session-2=b; fe_session-3=c; theme=dark', [
      'fe_session-1=whole; Path=/',
      'fe_session-2=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'fe_session-3=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    ]);

    expect(result).toBe('fe_session-1=whole; theme=dark');
  });

  it('keeps "=" characters inside cookie values', () => {
    const result = mergeSetCookiesIntoCookieHeader('a=x==; b=1', ['c=base64value==; Path=/']);

    expect(result).toBe('a=x==; b=1; c=base64value==');
  });

  it('builds a header from scratch when the request had no cookies', () => {
    expect(mergeSetCookiesIntoCookieHeader(null, ['fe_session=abc; Path=/'])).toBe('fe_session=abc');
  });
});

describe('refreshAccessTokenIfNeededOnEdge', () => {
  it('returns undefined when there is no refresh cookie', async () => {
    mocks.cookieManager.getRefreshCookieFromRequestEdge.mockReturnValue(undefined);

    const result = await refreshAccessTokenIfNeededOnEdge(buildRequest());

    expect(result).toBeUndefined();
    expect(mocks.api.refreshTokenEmbedded).not.toHaveBeenCalled();
  });

  it('calls the embedded refresh endpoint with the request headers', async () => {
    mocks.api.refreshTokenEmbedded.mockResolvedValue(okRefreshResponse());
    mocks.cookieManager.create.mockReturnValue(['fe_session=sealed-session; Path=/']);

    await refreshAccessTokenIfNeededOnEdge(buildRequest('theme=dark'));

    expect(mocks.api.refreshTokenEmbedded).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'localhost:3000', cookie: 'theme=dark' })
    );
  });

  it('calls the hosted-login refresh endpoint when hosted login is enabled', async () => {
    mocks.config.isHostedLogin = true;
    mocks.api.refreshTokenHostedLogin.mockResolvedValue(okRefreshResponse());
    mocks.cookieManager.create.mockReturnValue(['fe_session=sealed-session; Path=/']);

    await refreshAccessTokenIfNeededOnEdge(buildRequest());

    expect(mocks.api.refreshTokenHostedLogin).toHaveBeenCalledWith(
      expect.any(Object),
      'old-refresh',
      'client-id',
      'client-secret'
    );
    expect(mocks.api.refreshTokenEmbedded).not.toHaveBeenCalled();
  });

  it('returns undefined when the refresh request throws', async () => {
    mocks.api.refreshTokenEmbedded.mockRejectedValue(new Error('network down'));

    expect(await refreshAccessTokenIfNeededOnEdge(buildRequest())).toBeUndefined();
  });

  it('clears session cookies when the refresh response is not ok', async () => {
    mocks.api.refreshTokenEmbedded.mockResolvedValue(new Response('', { status: 401 }));
    mocks.cookieManager.getRequestCookiesHeaderToRemove.mockReturnValue([
      'fe_session=; Max-Age=0',
      'fe_refresh=; Max-Age=0',
    ]);

    const req = buildRequest();

    const result = await refreshAccessTokenIfNeededOnEdge(req);

    expect(mocks.cookieManager.getRequestCookiesHeaderToRemove).toHaveBeenCalledWith({
      cookieDomain: 'localhost',
      isSecured: true,
      req,
    });
    expect(result).toEqual({
      session: undefined,
      headers: { 'set-cookie': 'fe_session=; Max-Age=0, fe_refresh=; Max-Age=0' },
    });
  });

  it('returns undefined when the refresh fails and there is nothing to clear', async () => {
    mocks.api.refreshTokenEmbedded.mockResolvedValue(null);
    mocks.cookieManager.getRequestCookiesHeaderToRemove.mockReturnValue(undefined);

    expect(await refreshAccessTokenIfNeededOnEdge(buildRequest())).toBeUndefined();
  });

  it('returns only the upstream set-cookie headers when no session can be sealed', async () => {
    mocks.api.refreshTokenEmbedded.mockResolvedValue(okRefreshResponse(['fe_refresh_x=r1; Path=/']));
    mocks.sealTokens.mockResolvedValue('');

    const result = await refreshAccessTokenIfNeededOnEdge(buildRequest());

    expect(result).toEqual({ session: undefined, headers: { 'set-cookie': 'fe_refresh_x=r1; Path=/' } });
  });

  it('returns the refreshed session and set-cookie headers', async () => {
    mocks.api.refreshTokenEmbedded.mockResolvedValue(okRefreshResponse(['fe_refresh_x=r1; Path=/']));
    mocks.cookieManager.create.mockReturnValue(['fe_session=sealed-session; Path=/']);

    const req = buildRequest();

    const result = await refreshAccessTokenIfNeededOnEdge(req);

    expect(mocks.cookieManager.modifySetCookie).toHaveBeenCalledWith(['fe_refresh_x=r1; Path=/'], true);
    expect(mocks.cookieManager.create).toHaveBeenCalledWith({
      value: 'sealed-session',
      expires: new Date(FUTURE_EXP * 1000),
      secure: true,
      req,
    });
    expect(result?.session).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      user: expect.objectContaining({ sub: 'user-1' }),
    });
    expect(result?.headers?.['set-cookie']).toBe('fe_refresh_x=r1; Path=/, fe_session=sealed-session; Path=/');
  });

  it('forwards every request cookie to the app, with refreshed cookies updated', async () => {
    mocks.api.refreshTokenEmbedded.mockResolvedValue(okRefreshResponse(['fe_refresh_x=r1; Path=/']));
    mocks.cookieManager.create.mockReturnValue(['fe_session=sealed-session; Path=/']);
    const req = buildRequest('theme=dark; fe_session=expired; fe_refresh_x=r0');

    const result = await refreshAccessTokenIfNeededOnEdge(req);

    expect(result?.forwardedHeaders?.get('cookie')).toBe('theme=dark; fe_session=sealed-session; fe_refresh_x=r1');
  });

  it('forwards a chunked session cookie whole and drops stale chunks', async () => {
    mocks.api.refreshTokenEmbedded.mockResolvedValue(okRefreshResponse());
    mocks.cookieManager.create.mockReturnValue([
      'fe_session-1=part1; Path=/',
      'fe_session-2=part2; Path=/',
      'fe_session-3=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    ]);
    const req = buildRequest('fe_session-1=o1; fe_session-2=o2; fe_session-3=o3; theme=dark');

    const result = await refreshAccessTokenIfNeededOnEdge(req);

    expect(result?.forwardedHeaders?.get('cookie')).toBe('fe_session-1=part1; fe_session-2=part2; theme=dark');
  });
});

describe('createSessionFromAccessTokenOnEdge', () => {
  it('accepts snake_case token fields and seals both tokens', async () => {
    const [session, decoded, refreshToken] = await createSessionFromAccessTokenOnEdge({
      access_token: 'a',
      refresh_token: 'r',
    });

    expect(mocks.jwtVerify).toHaveBeenCalledWith('a');
    expect(mocks.sealTokens).toHaveBeenCalledWith({ accessToken: 'a', refreshToken: 'r' }, FUTURE_EXP);
    expect(session).toBe('sealed-session');
    expect(refreshToken).toBe('r');
    expect(decoded.expiresIn).toBeGreaterThan(3500);
  });
});
