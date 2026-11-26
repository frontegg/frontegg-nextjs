import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/config', () => ({
  default: {
    baseUrl: 'https://auth.example.com',
    appUrl: 'https://app.example.com',
    clientId: 'client-id',
    appId: undefined,
    rewriteCookieByAppId: false,
    shouldForwardIp: false,
    sharedSecret: undefined,
    authRoutes: {},
  },
}));

import api, { getMe, getEntitlements, getTenants, getMeAuthorization, getPublicSettings } from '../../../src/api';

const BASE = 'https://auth.example.com';
const fetchMock = vi.fn();

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const lastCall = () => fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit];

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadPublicKey', () => {
  it('fetches the jwks with force-cache and returns the first key', async () => {
    const keys = [{ kid: 'first' }, { kid: 'second' }];
    fetchMock.mockResolvedValue(jsonResponse({ keys }));

    const key = await api.loadPublicKey();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/.well-known/jwks.json`, { cache: 'force-cache' });
    expect(key).toEqual({ kid: 'first' });
  });

  it('rejects when the jwks request fails at the network level', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(api.loadPublicKey()).rejects.toThrow('network down');
  });
});

describe('refreshTokenEmbedded', () => {
  it('posts an empty body to the embedded refresh endpoint with built headers', async () => {
    const response = jsonResponse({ accessToken: 'a' });
    fetchMock.mockResolvedValue(response);

    const result = await api.refreshTokenEmbedded({ cookie: 'fe_refresh_x=1', authorization: 'Bearer t' });

    const [url, init] = lastCall();
    expect(url).toBe(`${BASE}/frontegg/identity/resources/auth/v1/user/token/refresh`);
    expect(init).toMatchObject({ method: 'POST', body: '{}', credentials: 'include' });
    expect(init.headers).toMatchObject({
      cookie: 'fe_refresh_x=1',
      authorization: 'Bearer t',
      'content-type': 'application/json',
      origin: BASE,
    });
    expect(result).toBe(response);
  });
});

describe('refreshTokenHostedLogin', () => {
  it('posts a refresh_token grant to the oauth token endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await api.refreshTokenHostedLogin({ accept: '*/*' }, 'refresh-123', 'cid', 'csecret');

    const [url, init] = lastCall();
    expect(url).toBe(`${BASE}/frontegg/oauth/token`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      grant_type: 'refresh_token',
      refresh_token: 'refresh-123',
      client_id: 'cid',
      client_secret: 'csecret',
    });
    expect(init.headers).toMatchObject({ accept: '*/*' });
  });

  it('omits client credentials from the body when not provided', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await api.refreshTokenHostedLogin({}, 'refresh-123');

    expect(JSON.parse(lastCall()[1].body as string)).toEqual({
      grant_type: 'refresh_token',
      refresh_token: 'refresh-123',
    });
  });
});

describe('exchangeHostedLoginToken', () => {
  it('posts an authorization_code grant with an explicit redirect uri', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await api.exchangeHostedLoginToken({}, 'code-1', 'cid', 'secret', 'https://app.example.com/cb');

    const [url, init] = lastCall();
    expect(url).toBe(`${BASE}/frontegg/oauth/token`);
    expect(JSON.parse(init.body as string)).toEqual({
      redirect_uri: 'https://app.example.com/cb',
      grant_type: 'authorization_code',
      code: 'code-1',
      client_id: 'cid',
      client_secret: 'secret',
    });
  });
});

describe.each([
  ['getMe', getMe, `${BASE}/frontegg/identity/resources/users/v2/me`],
  ['getEntitlements', getEntitlements, `${BASE}/entitlements/api/v2/user-entitlements`],
  ['getTenants', getTenants, `${BASE}/frontegg/identity/resources/users/v3/me/tenants`],
  ['getMeAuthorization', getMeAuthorization, `${BASE}/frontegg/identity/resources/users/v1/me/authorization`],
  ['getPublicSettings', getPublicSettings, `${BASE}/frontegg/tenants/resources/account-settings/v1/public`],
])('%s', (_name, fn, expectedUrl) => {
  it('sends a GET request with built headers to the expected endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await (fn as (h: Record<string, string>) => Promise<unknown>)({ authorization: 'Bearer abc' });

    const [url, init] = lastCall();
    expect(url).toBe(expectedUrl);
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('include');
    expect(init.headers).toMatchObject({ authorization: 'Bearer abc', origin: BASE });
  });

  it('returns the parsed body when the response is ok', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'payload' }));

    const result = await (fn as (h: Record<string, string>) => Promise<unknown>)({});

    expect(result).toEqual({ id: 'payload' });
  });

  it('returns undefined when the response is not ok', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'nope' }, 401));

    const result = await (fn as (h: Record<string, string>) => Promise<unknown>)({});

    expect(result).toBeUndefined();
  });
});
