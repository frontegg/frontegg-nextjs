import { describe, it, expect, vi, beforeEach } from 'vitest';

const CONFIG_BASE = vi.hoisted(() => ({
  appUrl: 'https://app.example.com',
  authRoutes: {} as Record<string, string>,
  secureJwtEnabled: true,
  hostedLoginCallbackOnAppUrl: true,
  clientId: 'abc-def-ghi',
  clientSecret: 'super-secret',
  shouldForwardIp: false,
  isSSL: true,
  rewriteCookieByAppId: false,
  appId: undefined as string | undefined,
  cookieName: 'fe_session',
  cookieDomain: 'app.example.com',
  cookieSameSite: 'none' as const,
}));

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
import { handleSessionOnEdge, isAppUrlLoginCallback } from '../../../src/edge/getSessionOnEdge';

const mockedExchange = vi.mocked(api.exchangeHostedLoginToken);
const mockedVerify = vi.mocked(JwtManager.verify);
const mockedSeal = vi.mocked(encryptionEdge.sealTokens);

const params = (qs: string) => new URLSearchParams(qs);

const run = (pathname: string, qs: string) => {
  const request = new Request(`https://app.example.com${pathname}?${qs}`);
  return handleSessionOnEdge({
    request,
    pathname,
    searchParams: params(qs),
    headers: request.headers as any,
  });
};

const mockSuccessfulExchange = () => {
  mockedExchange.mockResolvedValue({
    json: async () => ({ access_token: 'access', refresh_token: 'refresh' }),
  } as any);
  mockedVerify.mockResolvedValue({ payload: { exp: Math.floor(Date.now() / 1000) + 3600 } } as any);
  mockedSeal.mockResolvedValue('sealed-session' as any);
};

beforeEach(() => {
  Object.assign(config, CONFIG_BASE);
});

describe('isAppUrlLoginCallback', () => {
  it('matches a code landing on the app url', () => {
    expect(isAppUrlLoginCallback('/', params('code=abc'))).toBe(true);
  });

  it('ignores the app url without a code', () => {
    expect(isAppUrlLoginCallback('/', params(''))).toBe(false);
  });

  it('ignores a code on any other path', () => {
    expect(isAppUrlLoginCallback('/dashboard', params('code=abc'))).toBe(false);
  });

  it('is off unless enabled by the env variable', () => {
    Object.assign(config, { hostedLoginCallbackOnAppUrl: false });
    expect(isAppUrlLoginCallback('/', params('code=abc'))).toBe(false);
  });

  it('is off when secure jwt is disabled', () => {
    Object.assign(config, { secureJwtEnabled: false });
    expect(isAppUrlLoginCallback('/', params('code=abc'))).toBe(false);
  });

  it('matches the path of an app url that is served under a sub path', () => {
    Object.assign(config, { appUrl: 'https://app.example.com/portal/' });
    expect(isAppUrlLoginCallback('/portal', params('code=abc'))).toBe(true);
    expect(isAppUrlLoginCallback('/portal/', params('code=abc'))).toBe(true);
    expect(isAppUrlLoginCallback('/', params('code=abc'))).toBe(false);
  });
});

describe('handleSessionOnEdge with a code on the app url', () => {
  it('exchanges the code against the app url and sets the session cookies', async () => {
    mockSuccessfulExchange();

    const response = await run('/', 'code=abc');

    expect(mockedExchange).toHaveBeenCalledTimes(1);
    expect(mockedExchange.mock.calls[0][1]).toBe('abc');
    expect(mockedExchange.mock.calls[0][4]).toBe('https://app.example.com');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.example.com/');
    expect(response.headers.get('set-cookie')).toContain('fe_session');
  });

  it('falls back to the regular session handling when the exchange fails', async () => {
    mockedExchange.mockResolvedValue({ json: async () => ({ errors: ['invalid redirect uri'] }) } as any);
    mockedVerify.mockRejectedValue(new Error('invalid token'));

    const response = await run('/', 'code=not-a-frontegg-code');

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/account/login');
  });

  it('does not exchange the code when the feature is disabled', async () => {
    Object.assign(config, { hostedLoginCallbackOnAppUrl: false });

    const response = await run('/', 'code=abc');

    expect(mockedExchange).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toContain('/account/login');
  });

  it('keeps exchanging the regular callback against the callback route', async () => {
    mockSuccessfulExchange();

    await run('/oauth/callback', 'code=abc');

    expect(mockedExchange).toHaveBeenCalledTimes(1);
    expect(mockedExchange.mock.calls[0][4]).toBeUndefined();
  });
});
