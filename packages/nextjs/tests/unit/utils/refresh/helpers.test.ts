import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FRONTEGG_CONFIG_BASE } from './fixtures';

vi.mock('../../../../src/config', () => ({
  default: { ...FRONTEGG_CONFIG_BASE },
}));

vi.mock('../../../../src/api', () => ({
  default: {
    refreshTokenEmbedded: vi.fn(),
    refreshTokenHostedLogin: vi.fn(),
  },
}));

vi.mock('../../../../src/common', () => ({
  getTokensFromCookie: vi.fn(),
  createSessionFromAccessToken: vi.fn(),
}));

import {
  hasRefreshTokenCookie,
  refreshAccessTokenEmbedded,
  refreshAccessTokenHostedLogin,
  isOauthCallback,
  isSamlCallback,
  isRuntimeNextRequest,
  isSSOPostRequest,
  hasSetSessionCookie,
  saveForwardedSession,
  getForwardedSession,
} from '../../../../src/utils/refreshAccessTokenIfNeeded/helpers';
import api from '../../../../src/api';
import { getTokensFromCookie } from '../../../../src/common';
import config from '../../../../src/config';
import CookieManager from '../../../../src/utils/cookies';
import { FRONTEGG_FORWARDED_SESSION_KEY } from '../../../../src/utils/common/constants';

const mockedApi = vi.mocked(api);
const mockedGetTokens = vi.mocked(getTokensFromCookie);

beforeEach(() => {
  // restore baseline config between tests
  Object.assign(config, FRONTEGG_CONFIG_BASE, { appId: undefined });
});

describe('hasRefreshTokenCookie', () => {
  it('returns false when cookies is null', () => {
    expect(hasRefreshTokenCookie(null as any)).toBe(false);
  });

  it('returns false when no refresh token cookie present', () => {
    expect(hasRefreshTokenCookie({ other_cookie: 'x' })).toBe(false);
  });

  it('returns true when refresh token cookie matches by exact key', () => {
    const key = CookieManager.refreshTokenKey;
    expect(hasRefreshTokenCookie({ [key]: 'value' })).toBe(true);
  });

  it('returns true when refresh token cookie key contains dashes (normalized)', () => {
    const key = CookieManager.refreshTokenKey;
    // Insert a dash version: replace last 2 chars with -X
    const dashed = key.slice(0, 4) + '-' + key.slice(4);
    expect(hasRefreshTokenCookie({ [dashed]: 'value' })).toBe(true);
  });

  it('returns false for empty object', () => {
    expect(hasRefreshTokenCookie({})).toBe(false);
  });
});

describe('refreshAccessTokenEmbedded', () => {
  it('returns null when no refresh token cookie present', async () => {
    const req = { headers: {}, cookies: {} } as any;
    const result = await refreshAccessTokenEmbedded(req);
    expect(result).toBeNull();
    expect(mockedApi.refreshTokenEmbedded).not.toHaveBeenCalled();
  });

  it('calls api.refreshTokenEmbedded when refresh token present', async () => {
    const fakeRes = { ok: true } as any;
    mockedApi.refreshTokenEmbedded.mockResolvedValueOnce(fakeRes);
    const key = CookieManager.refreshTokenKey;
    const req = { headers: { foo: 'bar' }, cookies: { [key]: 'rt' } } as any;
    const result = await refreshAccessTokenEmbedded(req);
    expect(result).toBe(fakeRes);
    expect(mockedApi.refreshTokenEmbedded).toHaveBeenCalledWith(req.headers);
  });

  it('attaches frontegg-requested-application-id header when appId set', async () => {
    (config as any).appId = 'app-1';
    mockedApi.refreshTokenEmbedded.mockResolvedValueOnce({ ok: true } as any);
    const key = CookieManager.refreshTokenKey;
    const req = { headers: {} as Record<string, string>, cookies: { [key]: 'rt' } } as any;
    await refreshAccessTokenEmbedded(req);
    expect(req.headers['frontegg-requested-application-id']).toBe('app-1');
  });
});

describe('refreshAccessTokenHostedLogin', () => {
  it('returns null when no refresh token in seal', async () => {
    mockedGetTokens.mockResolvedValueOnce(undefined);
    const req = { headers: {} } as any;
    vi.spyOn(CookieManager, 'getSessionCookieFromRequest').mockReturnValueOnce('seal');
    const result = await refreshAccessTokenHostedLogin(req);
    expect(result).toBeNull();
  });

  it('calls api.refreshTokenHostedLogin without secret when secureJwtEnabled=false', async () => {
    mockedGetTokens.mockResolvedValueOnce({ refreshToken: 'rt-1' } as any);
    mockedApi.refreshTokenHostedLogin.mockResolvedValueOnce({ ok: true } as any);
    vi.spyOn(CookieManager, 'getSessionCookieFromRequest').mockReturnValueOnce('seal');
    const req = { headers: {} as Record<string, string> } as any;
    const res = await refreshAccessTokenHostedLogin(req);
    expect(res).toEqual({ ok: true });
    expect(mockedApi.refreshTokenHostedLogin).toHaveBeenCalledWith(req.headers, 'rt-1');
  });

  it('calls api.refreshTokenHostedLogin with clientId/secret when secureJwtEnabled=true', async () => {
    (config as any).secureJwtEnabled = true;
    mockedGetTokens.mockResolvedValueOnce({ refreshToken: 'rt-2' } as any);
    mockedApi.refreshTokenHostedLogin.mockResolvedValueOnce({ ok: true } as any);
    vi.spyOn(CookieManager, 'getSessionCookieFromRequest').mockReturnValueOnce('seal');
    const req = { headers: {} } as any;
    await refreshAccessTokenHostedLogin(req);
    expect(mockedApi.refreshTokenHostedLogin).toHaveBeenCalledWith(req.headers, 'rt-2', 'abc-def-ghi', 'super-secret');
  });

  it('attaches frontegg-requested-application-id header when appId set', async () => {
    (config as any).appId = 'app-2';
    mockedGetTokens.mockResolvedValueOnce({ refreshToken: 'rt' } as any);
    mockedApi.refreshTokenHostedLogin.mockResolvedValueOnce({ ok: true } as any);
    vi.spyOn(CookieManager, 'getSessionCookieFromRequest').mockReturnValueOnce('seal');
    const req = { headers: {} as Record<string, string> } as any;
    await refreshAccessTokenHostedLogin(req);
    expect(req.headers['frontegg-requested-application-id']).toBe('app-2');
  });

  it('returns null when getTokensFromCookie throws', async () => {
    mockedGetTokens.mockRejectedValueOnce(new Error('boom'));
    vi.spyOn(CookieManager, 'getSessionCookieFromRequest').mockReturnValueOnce('seal');
    const result = await refreshAccessTokenHostedLogin({ headers: {} } as any);
    expect(result).toBeNull();
  });
});

describe('url-classification helpers', () => {
  it('isRuntimeNextRequest matches /_next/ prefix', () => {
    expect(isRuntimeNextRequest('/_next/static/foo.js')).toBe(true);
    expect(isRuntimeNextRequest('/foo')).toBe(false);
    expect(isRuntimeNextRequest('/')).toBe(false);
  });

  it('isOauthCallback matches /oauth/callback prefix', () => {
    expect(isOauthCallback('/oauth/callback')).toBe(true);
    expect(isOauthCallback('/oauth/callback?code=1')).toBe(true);
    expect(isOauthCallback('/account/login')).toBe(false);
  });

  it('isSamlCallback matches saml and oidc callback prefixes', () => {
    expect(isSamlCallback('/account/saml/callback')).toBe(true);
    expect(isSamlCallback('/account/oidc/callback?x=1')).toBe(true);
    expect(isSamlCallback('/oauth/callback')).toBe(false);
  });

  it('isSSOPostRequest matches exact frontegg auth callback urls', () => {
    expect(isSSOPostRequest('/frontegg/auth/saml/callback')).toBe(true);
    expect(isSSOPostRequest('/frontegg/auth/oidc/callback')).toBe(true);
    expect(isSSOPostRequest('/frontegg/auth/saml/callback?x=1')).toBe(false);
  });

  it('hasSetSessionCookie returns false for falsy or numeric input', () => {
    expect(hasSetSessionCookie(undefined)).toBe(false);
    expect(hasSetSessionCookie(0 as any)).toBe(false);
    expect(hasSetSessionCookie(123 as any)).toBe(false);
  });

  it('hasSetSessionCookie returns true for string containing cookie name', () => {
    expect(hasSetSessionCookie('fe_session=abc; Path=/')).toBe(true);
    expect(hasSetSessionCookie('other=1')).toBe(false);
  });

  it('hasSetSessionCookie returns true for array starting with cookie name', () => {
    expect(hasSetSessionCookie(['fe_session=abc; Path=/'])).toBe(true);
    expect(hasSetSessionCookie(['other=1', 'fe_session=abc'])).toBe(true);
    expect(hasSetSessionCookie(['other=1'])).toBe(false);
  });
});

describe('forwarded-session helpers', () => {
  it('saveForwardedSession writes session to holder', () => {
    const holder: any = {};
    const session = { accessToken: 'a', user: {}, refreshToken: 'r' } as any;
    saveForwardedSession(holder, session);
    expect(holder[FRONTEGG_FORWARDED_SESSION_KEY]).toBe(session);
  });

  it('getForwardedSession reads session from holder', () => {
    const session = { accessToken: 'b' } as any;
    const holder: any = { [FRONTEGG_FORWARDED_SESSION_KEY]: session };
    expect(getForwardedSession(holder)).toBe(session);
  });

  it('getForwardedSession returns undefined when no session stored', () => {
    expect(getForwardedSession({})).toBeUndefined();
  });

  it('saveForwardedSession can store undefined to clear', () => {
    const holder: any = { [FRONTEGG_FORWARDED_SESSION_KEY]: { accessToken: 'a' } };
    saveForwardedSession(holder, undefined);
    expect(holder[FRONTEGG_FORWARDED_SESSION_KEY]).toBeUndefined();
  });
});
