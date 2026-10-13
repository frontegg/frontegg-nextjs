import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/config', () => ({
  default: {
    baseUrl: 'https://auth.example.com',
    clientId: 'vendor-id',
    sharedSecret: 'shared-secret',
    rewriteCookieByAppId: false,
    appId: undefined,
    shouldForwardIp: true,
    isVercel: false,
    forwardIpHeader: undefined,
  },
}));

import config from '../../../src/config';
import { buildRequestHeaders } from '../../../src/api/utils';

const browserControlledHeaders = {
  'x-frontegg-forwarded-for': '6.6.6.6',
  'cf-connecting-ip': '7.7.7.7',
  'x-forwarded-for': '203.0.113.10',
};

beforeEach(() => {
  Object.assign(config, { shouldForwardIp: true, isVercel: false, forwardIpHeader: undefined });
});

describe('buildRequestHeaders client ip forwarding', () => {
  it('forwards no client ip when neither Vercel nor a trusted header is configured', () => {
    const headers = buildRequestHeaders(browserControlledHeaders);

    expect(headers['x-frontegg-forwarded-for']).toBeUndefined();
    expect(headers['x-frontegg-headers-verifier']).toBeUndefined();
  });

  it('forwards the x-forwarded-for that Vercel overwrites and ignores headers the browser can set', () => {
    Object.assign(config, { isVercel: true });

    const headers = buildRequestHeaders(browserControlledHeaders);

    expect(headers['x-frontegg-forwarded-for']).toBe('203.0.113.10');
    expect(headers['x-frontegg-headers-verifier']).toBe('shared-secret');
    expect(headers['frontegg-vendor-id']).toBe('vendor-id');
  });

  it('forwards only the configured trusted header', () => {
    Object.assign(config, { isVercel: true, forwardIpHeader: 'cf-connecting-ip' });

    const headers = buildRequestHeaders(browserControlledHeaders);

    expect(headers['x-frontegg-forwarded-for']).toBe('7.7.7.7');
  });

  it('forwards no client ip when forwarding is off', () => {
    Object.assign(config, { isVercel: true, shouldForwardIp: false });

    const headers = buildRequestHeaders(browserControlledHeaders);

    expect(headers['x-frontegg-forwarded-for']).toBeUndefined();
  });
});
