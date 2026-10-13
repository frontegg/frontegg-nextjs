import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/config', () => ({
  default: {
    baseUrl: 'https://auth.example.com',
    clientId: 'vendor-id',
    sharedSecret: 'shared-secret',
    rewriteCookieByAppId: false,
    appId: undefined,
    shouldForwardIp: true,
    isVercel: true,
    forwardIpHeader: undefined,
  },
}));

import config from '../../../src/config';
import { buildRequestHeaders } from '../../../src/api/utils';

const browserHeaders = {
  'x-frontegg-forwarded-for': '6.6.6.6',
  'cf-connecting-ip': '7.7.7.7',
  'x-forwarded-for': '203.0.113.10',
};

beforeEach(() => {
  Object.assign(config, { shouldForwardIp: true, isVercel: true, forwardIpHeader: undefined });
});

describe('buildRequestHeaders client ip forwarding', () => {
  it('forwards the trusted client ip with the shared secret and vendor id', () => {
    const headers = buildRequestHeaders(browserHeaders);

    expect(headers['x-frontegg-forwarded-for']).toBe('203.0.113.10');
    expect(headers['x-frontegg-headers-verifier']).toBe('shared-secret');
    expect(headers['frontegg-vendor-id']).toBe('vendor-id');
  });

  it('forwards an explicitly resolved client ip instead of reading the headers', () => {
    const headers = buildRequestHeaders({}, '198.51.100.7');

    expect(headers['x-frontegg-forwarded-for']).toBe('198.51.100.7');
  });

  it('forwards no client ip when none can be resolved', () => {
    const headers = buildRequestHeaders({ 'x-frontegg-forwarded-for': '6.6.6.6' });

    expect(headers['x-frontegg-forwarded-for']).toBeUndefined();
    expect(headers['x-frontegg-headers-verifier']).toBeUndefined();
  });

  it('forwards no client ip when forwarding is off', () => {
    Object.assign(config, { shouldForwardIp: false });

    const headers = buildRequestHeaders(browserHeaders, '198.51.100.7');

    expect(headers['x-frontegg-forwarded-for']).toBeUndefined();
  });
});
