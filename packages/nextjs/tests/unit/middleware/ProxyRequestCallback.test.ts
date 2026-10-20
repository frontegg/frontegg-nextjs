import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/config', () => ({
  default: {
    cookieName: 'fe_session',
    rewriteCookieByAppId: false,
    appId: undefined,
    clientId: 'vendor-id',
    sharedSecret: 'shared-secret',
    shouldForwardIp: true,
    isVercel: false,
    forwardIpHeader: undefined,
    ipResolver: undefined,
  },
}));

vi.mock('../../../src/utils/cookies', () => ({
  default: { parseCookieHeader: () => ({}) },
}));

import config from '../../../src/config';
import ProxyRequestCallback from '../../../src/middleware/ProxyRequestCallback';

const CLIENT_IP = '198.51.100.7';
const SPOOFED_IP = '6.6.6.6';

const proxyRequest = (headers: Record<string, string>, remoteAddress?: string) => {
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
  const req = { url: '/frontegg/identity/resources/auth/v1/user', method: 'GET', headers, socket: { remoteAddress } };
  ProxyRequestCallback(proxyReq as any, req as any, {} as any, {} as any);
  return {
    forwardedIp: outgoingHeaders['x-frontegg-forwarded-for'],
    verifier: outgoingHeaders['x-frontegg-headers-verifier'],
  };
};

beforeEach(() => {
  Object.assign(config, { isVercel: false, forwardIpHeader: undefined, ipResolver: undefined, shouldForwardIp: true });
});

describe('ProxyRequestCallback client ip forwarding', () => {
  it('forwards the x-forwarded-for that Vercel overwrites and ignores headers the caller sent', () => {
    Object.assign(config, { isVercel: true });

    const { forwardedIp, verifier } = proxyRequest({
      'x-forwarded-for': CLIENT_IP,
      'cf-connecting-ip': SPOOFED_IP,
      'x-frontegg-forwarded-for': SPOOFED_IP,
    });

    expect(forwardedIp).toBe(CLIENT_IP);
    expect(verifier).toBe('shared-secret');
  });

  it('forwards no client ip off Vercel when nothing is configured', () => {
    const { forwardedIp, verifier } = proxyRequest({ 'x-forwarded-for': CLIENT_IP }, CLIENT_IP);

    expect(forwardedIp).toBeUndefined();
    expect(verifier).toBeUndefined();
  });

  it('removes the forwarded ip and verifier headers sent by the caller when no client ip is resolved', () => {
    const { forwardedIp, verifier } = proxyRequest({
      'x-frontegg-forwarded-for': SPOOFED_IP,
      'x-frontegg-headers-verifier': 'guessed-secret',
    });

    expect(forwardedIp).toBeUndefined();
    expect(verifier).toBeUndefined();
  });

  it('forwards the rightmost value of the configured header off Vercel', () => {
    Object.assign(config, { forwardIpHeader: 'x-real-ip' });

    const { forwardedIp } = proxyRequest({ 'x-real-ip': `${SPOOFED_IP}, ${CLIENT_IP}`, 'x-forwarded-for': SPOOFED_IP });

    expect(forwardedIp).toBe(CLIENT_IP);
  });

  it('forwards the client ip of a custom ipResolver off Vercel', () => {
    Object.assign(config, { ipResolver: (request: any) => request.socket.remoteAddress });

    const { forwardedIp } = proxyRequest({ 'x-forwarded-for': SPOOFED_IP }, `::ffff:${CLIENT_IP}`);

    expect(forwardedIp).toBe(CLIENT_IP);
  });

  it('prefers a custom ipResolver', () => {
    Object.assign(config, { isVercel: true, ipResolver: () => '203.0.113.20' });

    const { forwardedIp } = proxyRequest({ 'x-forwarded-for': CLIENT_IP });

    expect(forwardedIp).toBe('203.0.113.20');
  });
});
