import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FRONTEGG_CONFIG_BASE, mockNextPageContext, mockJwt, mockRefreshResponse } from './fixtures';

// --- Mocks (must be declared before importing the SUT) ---

vi.mock('../../../../src/config', () => ({
  default: { ...FRONTEGG_CONFIG_BASE },
}));

vi.mock('../../../../src/utils/cookies', () => ({
  default: {
    getSessionCookieFromRedirectedResponse: vi.fn(),
    getSessionCookieFromRequest: vi.fn(),
    removeCookies: vi.fn(),
    modifySetCookie: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../../../src/utils/refreshAccessTokenIfNeeded/helpers', () => ({
  isOauthCallback: vi.fn(() => false),
  isSamlCallback: vi.fn(() => false),
  isRuntimeNextRequest: vi.fn(() => false),
  hasSetSessionCookie: vi.fn(() => false),
  refreshAccessTokenEmbedded: vi.fn(),
  refreshAccessTokenHostedLogin: vi.fn(),
  saveForwardedSession: vi.fn(),
  getForwardedSession: vi.fn(),
}));

vi.mock('../../../../src/utils/createSession', () => ({
  default: vi.fn(),
}));

vi.mock('../../../../src/utils/encryption', () => ({
  default: { sealTokens: vi.fn(), unsealTokens: vi.fn() },
}));

vi.mock('../../../../src/common', () => ({
  createSessionFromAccessToken: vi.fn(),
  getTokensFromCookie: vi.fn(),
}));

vi.mock('../../../../src/api/utils', async (orig) => {
  const actual = await orig<typeof import('../../../../src/api/utils')>();
  return {
    ...actual,
    getClientIp: vi.fn(),
  };
});

import refreshAccessTokenIfNeeded from '../../../../src/utils/refreshAccessTokenIfNeeded';
import config from '../../../../src/config';
import CookieManager from '../../../../src/utils/cookies';
import * as helpers from '../../../../src/utils/refreshAccessTokenIfNeeded/helpers';
import createSession from '../../../../src/utils/createSession';
import { createSessionFromAccessToken } from '../../../../src/common';
import { getClientIp, FRONTEGG_FORWARD_IP_HEADER } from '../../../../src/api/utils';

const mockedCookieManager = vi.mocked(CookieManager);
const mockedHelpers = vi.mocked(helpers);
const mockedCreateSession = vi.mocked(createSession);
const mockedCreateSessionFromAccessToken = vi.mocked(createSessionFromAccessToken);
const mockedGetClientIp = vi.mocked(getClientIp);

beforeEach(() => {
  Object.assign(config, FRONTEGG_CONFIG_BASE, { appId: undefined });
  // reset default helper return values
  mockedHelpers.isOauthCallback.mockReturnValue(false);
  mockedHelpers.isSamlCallback.mockReturnValue(false);
  mockedHelpers.isRuntimeNextRequest.mockReturnValue(false);
  mockedHelpers.hasSetSessionCookie.mockReturnValue(false);
  mockedHelpers.getForwardedSession.mockReturnValue(null);
  mockedCookieManager.modifySetCookie.mockReturnValue([]);
  mockedCookieManager.create.mockReturnValue(['fe_session=cookie-value; Path=/']);
  mockedGetClientIp.mockReturnValue(undefined);
});

// ---------- Early-exit branches ----------
describe('refreshAccessTokenIfNeeded — early exits', () => {
  it('returns null when ctx.res is missing', async () => {
    const result = await refreshAccessTokenIfNeeded({
      req: { url: '/' } as any,
      res: undefined as any,
      pathname: '/',
    } as any);
    expect(result).toBeNull();
  });

  it('returns null when ctx.req is missing', async () => {
    const result = await refreshAccessTokenIfNeeded({ req: undefined as any, res: {} as any, pathname: '/' } as any);
    expect(result).toBeNull();
  });

  it('returns null when ctx.req.url is missing', async () => {
    const { req, res } = mockNextPageContext({ url: undefined });
    (req as any).url = undefined;
    const result = await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(result).toBeNull();
  });

  it('returns existing session when set-cookie already on response (hasSetSessionCookie)', async () => {
    mockedHelpers.hasSetSessionCookie.mockReturnValue(true);
    mockedCookieManager.getSessionCookieFromRedirectedResponse.mockReturnValue('seal');
    const session: any = { accessToken: 'a' };
    mockedCreateSession.mockResolvedValueOnce(session);

    const { req, res } = mockNextPageContext({
      url: '/',
      sessionCookieInResponse: ['fe_session=cookie-value'],
    });

    const result = await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(result).toBe(session);
  });

  it('falls back to getForwardedSession when createSession returns null after a redirect', async () => {
    mockedHelpers.hasSetSessionCookie.mockReturnValue(true);
    mockedCookieManager.getSessionCookieFromRedirectedResponse.mockReturnValue('seal');
    mockedCreateSession.mockResolvedValueOnce(undefined);
    const fwd: any = { accessToken: 'fwd' };
    mockedHelpers.getForwardedSession.mockReturnValue(fwd);

    const { req, res } = mockNextPageContext({
      url: '/',
      sessionCookieInResponse: ['fe_session=cookie-value'],
    });

    const result = await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(result).toBe(fwd);
  });
});

// ---------- Runtime-request and hosted-login branches ----------
describe('refreshAccessTokenIfNeeded — runtime + hosted-login branches', () => {
  it('resolves session from cookie for runtime next.js request', async () => {
    mockedHelpers.isRuntimeNextRequest.mockReturnValue(true);
    mockedCookieManager.getSessionCookieFromRequest.mockReturnValueOnce('seal');
    const session: any = { accessToken: 'rt' };
    mockedCreateSession.mockResolvedValueOnce(session);

    const { req, res } = mockNextPageContext({ url: '/_next/data/page.json' });
    const result = await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(result).toBe(session);
  });

  it('falls through to refresh path when runtime cookie session is null', async () => {
    mockedHelpers.isRuntimeNextRequest.mockReturnValue(true);
    mockedCookieManager.getSessionCookieFromRequest.mockReturnValue('seal');
    mockedCreateSession.mockResolvedValueOnce(undefined);
    // refresh path returns null response → null result
    mockedHelpers.refreshAccessTokenEmbedded.mockResolvedValueOnce(null);

    const { req, res } = mockNextPageContext({ url: '/_next/data/page.json' });
    const result = await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(result).toBeNull();
    expect(mockedCookieManager.removeCookies).toHaveBeenCalled();
  });

  it('respects config.disableInitialPropsRefreshToken', async () => {
    (config as any).disableInitialPropsRefreshToken = true;
    mockedCookieManager.getSessionCookieFromRequest.mockReturnValueOnce('seal');
    const session: any = { accessToken: 'di' };
    mockedCreateSession.mockResolvedValueOnce(session);

    const { req, res } = mockNextPageContext({ url: '/some/page' });
    const result = await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(result).toBe(session);
  });

  it('isHostedLogin + isOauthCallback removes cookies and continues', async () => {
    (config as any).isHostedLogin = true;
    mockedHelpers.isOauthCallback.mockReturnValue(true);
    // refreshAccessTokenHostedLogin returns null → end with removeCookies + null
    mockedHelpers.refreshAccessTokenHostedLogin.mockResolvedValueOnce(null);

    const { req, res } = mockNextPageContext({ url: '/oauth/callback?code=1' });
    const result = await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(mockedCookieManager.removeCookies).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('embedded login + isSamlCallback returns null without calling refresh', async () => {
    (config as any).isHostedLogin = false;
    mockedHelpers.isSamlCallback.mockReturnValue(true);

    const { req, res } = mockNextPageContext({ url: '/account/saml/callback' });
    const result = await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(result).toBeNull();
    expect(mockedHelpers.refreshAccessTokenEmbedded).not.toHaveBeenCalled();
    expect(mockedHelpers.refreshAccessTokenHostedLogin).not.toHaveBeenCalled();
  });
});

// ---------- Embedded + IP forwarding ----------
describe('refreshAccessTokenIfNeeded — embedded + ip forwarding', () => {
  it('forwards client ip headers when shouldForwardIp=true and ip available', async () => {
    (config as any).shouldForwardIp = true;
    mockedGetClientIp.mockReturnValue('1.2.3.4');
    mockedHelpers.refreshAccessTokenEmbedded.mockResolvedValueOnce(null);

    const { req, res } = mockNextPageContext({
      url: '/',
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });

    await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect((req as any).headers[FRONTEGG_FORWARD_IP_HEADER]).toBe('1.2.3.4');
  });

  it('uses socket.remoteAddress as ip fallback', async () => {
    (config as any).shouldForwardIp = true;
    mockedGetClientIp.mockReturnValue(undefined);
    mockedHelpers.refreshAccessTokenEmbedded.mockResolvedValueOnce(null);

    const { req, res } = mockNextPageContext({ url: '/', remoteAddress: '5.6.7.8' });
    await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect((req as any).headers[FRONTEGG_FORWARD_IP_HEADER]).toBe('5.6.7.8');
  });

  it('does NOT forward ip when shouldForwardIp=false', async () => {
    (config as any).shouldForwardIp = false;
    mockedGetClientIp.mockReturnValue('1.2.3.4');
    mockedHelpers.refreshAccessTokenEmbedded.mockResolvedValueOnce(null);

    const { req, res } = mockNextPageContext({ url: '/' });
    await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect((req as any).headers[FRONTEGG_FORWARD_IP_HEADER]).toBeUndefined();
  });
});

// ---------- Refresh-response handling ----------
describe('refreshAccessTokenIfNeeded — refresh response handling', () => {
  it('returns null and removes cookies when refresh response is null', async () => {
    mockedHelpers.refreshAccessTokenEmbedded.mockResolvedValueOnce(null);
    const { req, res } = mockNextPageContext({ url: '/' });
    const result = await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(result).toBeNull();
    expect(mockedCookieManager.removeCookies).toHaveBeenCalled();
  });

  it('returns null and removes cookies when refresh response is not ok', async () => {
    mockedHelpers.refreshAccessTokenEmbedded.mockResolvedValueOnce(mockRefreshResponse({ ok: false, status: 401 }));
    const { req, res } = mockNextPageContext({ url: '/' });
    const result = await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(result).toBeNull();
    expect(mockedCookieManager.removeCookies).toHaveBeenCalled();
  });

  it('returns null when createSessionFromAccessToken yields no session', async () => {
    mockedHelpers.refreshAccessTokenEmbedded.mockResolvedValueOnce(mockRefreshResponse());
    mockedCreateSessionFromAccessToken.mockResolvedValueOnce([] as any);
    const { req, res } = mockNextPageContext({ url: '/' });
    const result = await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(result).toBeNull();
  });

  it('returns full session and sets set-cookie on success path', async () => {
    const { decoded } = mockJwt();
    mockedHelpers.refreshAccessTokenEmbedded.mockResolvedValueOnce(mockRefreshResponse());
    mockedCreateSessionFromAccessToken.mockResolvedValueOnce(['sealed', decoded, 'rt-1'] as any);

    const { req, res } = mockNextPageContext({ url: '/' });
    const result = await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);

    expect(result).toMatchObject({
      accessToken: 'access-token-value',
      user: decoded,
      refreshToken: 'rt-1',
    });
    expect((res as any).setHeader).toHaveBeenCalledWith('set-cookie', expect.any(Array));
    expect(mockedHelpers.saveForwardedSession).toHaveBeenCalled();
  });
});

// ---------- Set-cookie compatibility shims + error path ----------
describe('refreshAccessTokenIfNeeded — set-cookie shims + error path', () => {
  it('reads set-cookie via headers.raw() (Next < 13.4 path)', async () => {
    const { decoded } = mockJwt();
    mockedHelpers.refreshAccessTokenEmbedded.mockResolvedValueOnce(
      mockRefreshResponse({ setCookieFormat: 'raw', setCookieHeaders: ['raw=1'] })
    );
    mockedCreateSessionFromAccessToken.mockResolvedValueOnce(['s', decoded, 'rt'] as any);
    mockedCookieManager.modifySetCookie.mockReturnValue(['raw=1']);

    const { req, res } = mockNextPageContext({ url: '/' });
    const result = await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(result).not.toBeNull();
    expect(mockedCookieManager.modifySetCookie).toHaveBeenCalledWith(['raw=1'], true);
  });

  it('reads set-cookie via headers.getSetCookie() (Next >= 13.4 path)', async () => {
    const { decoded } = mockJwt();
    mockedHelpers.refreshAccessTokenEmbedded.mockResolvedValueOnce(
      mockRefreshResponse({ setCookieFormat: 'getSetCookie', setCookieHeaders: ['gs=1'] })
    );
    mockedCreateSessionFromAccessToken.mockResolvedValueOnce(['s', decoded, 'rt'] as any);
    mockedCookieManager.modifySetCookie.mockReturnValue(['gs=1']);

    const { req, res } = mockNextPageContext({ url: '/' });
    await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(mockedCookieManager.modifySetCookie).toHaveBeenCalledWith(['gs=1'], true);
  });

  it('reads set-cookie via headers.get() fallback', async () => {
    const { decoded } = mockJwt();
    mockedHelpers.refreshAccessTokenEmbedded.mockResolvedValueOnce(
      mockRefreshResponse({ setCookieFormat: 'get', setCookieHeaders: ['g=1'] })
    );
    mockedCreateSessionFromAccessToken.mockResolvedValueOnce(['s', decoded, 'rt'] as any);
    mockedCookieManager.modifySetCookie.mockReturnValue([]);

    const { req, res } = mockNextPageContext({ url: '/' });
    await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(mockedCookieManager.modifySetCookie).toHaveBeenCalled();
  });

  it('falls back to empty array when no set-cookie surface present', async () => {
    const { decoded } = mockJwt();
    mockedHelpers.refreshAccessTokenEmbedded.mockResolvedValueOnce(mockRefreshResponse({ setCookieFormat: 'none' }));
    mockedCreateSessionFromAccessToken.mockResolvedValueOnce(['s', decoded, 'rt'] as any);
    mockedCookieManager.modifySetCookie.mockReturnValue([]);

    const { req, res } = mockNextPageContext({ url: '/' });
    const result = await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(result).not.toBeNull();
    expect(mockedCookieManager.modifySetCookie).toHaveBeenCalledWith([], true);
  });

  it('returns null when an unexpected error is thrown inside try block', async () => {
    mockedHelpers.refreshAccessTokenEmbedded.mockRejectedValueOnce(new Error('boom'));
    const { req, res } = mockNextPageContext({ url: '/' });
    const result = await refreshAccessTokenIfNeeded({ req, res, pathname: '/' } as any);
    expect(result).toBeNull();
  });
});
