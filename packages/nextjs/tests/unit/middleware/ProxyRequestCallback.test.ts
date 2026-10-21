import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/config', () => ({
  default: {
    cookieName: 'fe_session',
    rewriteCookieByAppId: false,
    appId: undefined,
    clientId: 'vendor-id',
    sharedSecret: 'shared-secret',
  },
}));

vi.mock('../../../src/utils/cookies', () => ({
  default: { parseCookieHeader: () => ({}) },
}));

import ProxyRequestCallback from '../../../src/middleware/ProxyRequestCallback';

const CLIENT_IP = '198.51.100.7';
const SPOOFED_IP = '6.6.6.6';
const SPOOFED_HEADERS = {
  'x-frontegg-forwarded-for': SPOOFED_IP,
  'x-frontegg-headers-verifier': 'guessed-secret',
  'frontegg-vendor-id': 'other-vendor-id',
};

const proxyRequest = (headers: Record<string, string>, clientIp?: string) => {
  const outgoingHeaders: Record<string, unknown> = { ...headers };
  const proxyReq = {
    setHeader: (name: string, value: unknown) => {
      outgoingHeaders[name.toLowerCase()] = value;
    },
    removeHeader: (name: string) => {
      delete outgoingHeaders[name.toLowerCase()];
    },
    write: vi.fn(),
  };
  const req = { url: '/frontegg/identity/resources/auth/v1/user', method: 'GET', headers };
  ProxyRequestCallback(proxyReq as any, req as any, {} as any, { clientIp });
  return {
    forwardedIp: outgoingHeaders['x-frontegg-forwarded-for'],
    verifier: outgoingHeaders['x-frontegg-headers-verifier'],
    vendorId: outgoingHeaders['frontegg-vendor-id'],
  };
};

describe('ProxyRequestCallback client ip forwarding', () => {
  it('forwards the client ip resolved by the middleware instead of the headers the caller sent', () => {
    const { forwardedIp, verifier, vendorId } = proxyRequest(SPOOFED_HEADERS, CLIENT_IP);

    expect(forwardedIp).toBe(CLIENT_IP);
    expect(verifier).toBe('shared-secret');
    expect(vendorId).toBe('vendor-id');
  });

  it('removes the forwarded ip, verifier and vendor id headers sent by the caller when no client ip is resolved', () => {
    const { forwardedIp, verifier, vendorId } = proxyRequest(SPOOFED_HEADERS);

    expect(forwardedIp).toBeUndefined();
    expect(verifier).toBeUndefined();
    expect(vendorId).toBeUndefined();
  });
});
