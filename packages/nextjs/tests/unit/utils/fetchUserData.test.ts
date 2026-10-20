import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/config', () => ({
  default: {
    baseUrl: 'https://auth.example.com',
    clientId: 'vendor-id',
    sharedSecret: 'shared-secret',
    appId: 'app-id',
    shouldForwardIp: true,
    isVercel: false,
    forwardIpHeader: undefined,
    ipResolver: undefined,
  },
}));

import config from '../../../src/config';
import fetchUserData from '../../../src/utils/fetchUserData';

const CLIENT_IP = '198.51.100.7';
const fetchMock = vi.fn();

beforeEach(() => {
  Object.assign(config, { shouldForwardIp: true, isVercel: false, forwardIpHeader: undefined, ipResolver: undefined });
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ id: 'user-id', tenants: [], activeTenant: null }),
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const loadUserData = async (headers: Record<string, string>, peerAddress?: string) => {
  const options = {
    getSession: async () => ({ accessToken: 'access-token', user: { exp: 2000000000 } }) as any,
    getHeaders: async () => headers,
    peerAddress,
  };
  return fetchUserData(options);
};

describe('fetchUserData client IP compatibility', () => {
  it.each([
    ['Vercel', { isVercel: true }, { 'x-forwarded-for': CLIENT_IP }, undefined],
    ['configured header', { forwardIpHeader: 'x-real-ip' }, { 'x-real-ip': CLIENT_IP }, '10.0.0.5'],
    ['custom ipResolver', { ipResolver: (request: any) => request.socket.remoteAddress }, {}, CLIENT_IP],
  ])(
    'forwards the client IP on all user-data requests for %s',
    async (_name, configOverrides, headers, peerAddress) => {
      Object.assign(config, configOverrides);
      const result = await loadUserData(headers, peerAddress);

      expect(result.user?.id).toBe('user-id');
      expect(fetchMock).toHaveBeenCalledTimes(4);
      for (const [, options] of fetchMock.mock.calls) {
        expect(options.headers).toMatchObject({
          authorization: 'Bearer access-token',
          'frontegg-requested-application-id': 'app-id',
          'x-frontegg-forwarded-for': CLIENT_IP,
          'x-frontegg-headers-verifier': 'shared-secret',
          'frontegg-vendor-id': 'vendor-id',
        });
      }
      expect(headers).not.toHaveProperty('x-frontegg-headers-verifier');
    }
  );

  it('forwards no client IP off Vercel when no source is configured', async () => {
    await loadUserData({ 'x-forwarded-for': '6.6.6.6' }, CLIENT_IP);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options.headers).not.toHaveProperty('x-frontegg-forwarded-for');
      expect(options.headers).not.toHaveProperty('x-frontegg-headers-verifier');
    }
  });

  it('keeps IP forwarding disabled when the existing option is off', async () => {
    Object.assign(config, { shouldForwardIp: false });
    await loadUserData({}, CLIENT_IP);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options.headers).not.toHaveProperty('x-frontegg-forwarded-for');
      expect(options.headers).not.toHaveProperty('x-frontegg-headers-verifier');
    }
  });
});
