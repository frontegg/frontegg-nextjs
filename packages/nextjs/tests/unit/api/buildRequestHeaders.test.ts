import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/config', () => ({
  default: {
    baseUrl: 'https://auth.example.com',
    clientId: 'vendor-id',
    sharedSecret: 'shared-secret',
    rewriteCookieByAppId: false,
    appId: undefined,
    shouldForwardIp: true,
    isVercel: true,
    clientIpHeader: undefined,
  },
}));

import config from '../../../src/config';
import { buildRequestHeaders } from '../../../src/api/utils';
import api from '../../../src/api';

const browserHeaders = {
  'x-frontegg-forwarded-for': '6.6.6.6',
  'cf-connecting-ip': '7.7.7.7',
  'x-forwarded-for': '203.0.113.10',
};

beforeEach(() => {
  Object.assign(config, { shouldForwardIp: true, isVercel: true, clientIpHeader: undefined });
});

describe('buildRequestHeaders client ip forwarding', () => {
  it('forwards the given client ip with the shared secret and vendor id', () => {
    const headers = buildRequestHeaders(browserHeaders, '198.51.100.7');

    expect(headers['x-frontegg-forwarded-for']).toBe('198.51.100.7');
    expect(headers['x-frontegg-headers-verifier']).toBe('shared-secret');
    expect(headers['frontegg-vendor-id']).toBe('vendor-id');
  });

  it('does not resolve the client ip from the headers again when none was resolved', () => {
    const headers = buildRequestHeaders(browserHeaders, undefined);

    expect(headers['x-frontegg-forwarded-for']).toBeUndefined();
    expect(headers['x-frontegg-headers-verifier']).toBeUndefined();
  });

  it('forwards no client ip when forwarding is off', () => {
    Object.assign(config, { shouldForwardIp: false });

    const headers = buildRequestHeaders(browserHeaders, '198.51.100.7');

    expect(headers['x-frontegg-forwarded-for']).toBeUndefined();
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('outbound authentication request compatibility', () => {
  const input = {
    ...browserHeaders,
    cookie: 'fe_session=internal-session; fe_refresh_vendor=refresh-cookie',
    authorization: 'Bearer access-token',
    'frontegg-requested-application-id': 'app-id',
    'frontegg-login-alias': 'tenant-alias',
    'user-agent': 'existing-client',
  };

  it.each(['embedded refresh', 'hosted refresh', 'code exchange'])('preserves existing fields for %s', async (flow) => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    let expectedBody: Record<string, string> = {};
    if (flow === 'embedded refresh') {
      await api.refreshTokenEmbedded(input, '198.51.100.7');
    } else if (flow === 'hosted refresh') {
      await api.refreshTokenHostedLogin(input, 'refresh-token', 'client-id', 'client-secret', '198.51.100.7');
      expectedBody = {
        grant_type: 'refresh_token',
        refresh_token: 'refresh-token',
        client_id: 'client-id',
        client_secret: 'client-secret',
      };
    } else {
      await api.exchangeHostedLoginToken(
        input,
        'code',
        'client-id',
        'client-secret',
        'https://app.example.com/oauth/callback',
        '198.51.100.7'
      );
      expectedBody = {
        grant_type: 'authorization_code',
        code: 'code',
        client_id: 'client-id',
        client_secret: 'client-secret',
        redirect_uri: 'https://app.example.com/oauth/callback',
      };
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toMatch(/^https:\/\/auth\.example\.com\//);
    expect(request).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(JSON.parse(request.body)).toEqual(expectedBody);
    expect(request.headers).toMatchObject({
      authorization: input.authorization,
      'frontegg-requested-application-id': 'app-id',
      'frontegg-login-alias': 'tenant-alias',
      'user-agent': 'existing-client',
      'x-frontegg-forwarded-for': '198.51.100.7',
      'x-frontegg-headers-verifier': 'shared-secret',
      'frontegg-vendor-id': 'vendor-id',
    });
    expect(request.headers.cookie).toContain('fe_refresh_vendor=refresh-cookie');
    expect(input).not.toHaveProperty('x-frontegg-headers-verifier');
  });
});
