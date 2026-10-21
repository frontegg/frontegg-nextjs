import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/config', () => ({
  default: {
    shouldForwardIp: true,
    isVercel: false,
    clientIpHeader: undefined,
  },
}));

import config from '../../../src/config';
import { headersToRecord, resolveTrustedClientIp } from '../../../src/api/utils';
import { isCloudflareIp, normalizeIp } from '../../../src/utils/clientIp';

const CLIENT_IP = '198.51.100.7';
const SPOOFED_IP = '6.6.6.6';
const CLOUDFLARE_EGRESS_IP = '172.70.1.1';
const PRIVATE_PROXY_IP = '10.0.0.5';

const resolve = (headers: Record<string, any>) => resolveTrustedClientIp({ headers });

beforeEach(() => {
  Object.assign(config, { shouldForwardIp: true, isVercel: false, clientIpHeader: undefined });
});

describe('resolveTrustedClientIp on Vercel', () => {
  beforeEach(() => {
    Object.assign(config, { isVercel: true });
  });

  it('uses the x-forwarded-for that Vercel overwrites', () => {
    expect(resolve({ 'x-forwarded-for': CLIENT_IP })).toBe(CLIENT_IP);
  });

  it('ignores a cf-connecting-ip sent by the caller', () => {
    expect(resolve({ 'x-forwarded-for': CLIENT_IP, 'cf-connecting-ip': SPOOFED_IP })).toBe(CLIENT_IP);
  });

  it('uses cf-connecting-ip when the request reached Vercel through Cloudflare', () => {
    expect(resolve({ 'x-forwarded-for': CLOUDFLARE_EGRESS_IP, 'cf-connecting-ip': CLIENT_IP })).toBe(CLIENT_IP);
  });

  it.each([
    ['missing', {}],
    ['not an ip address', { 'cf-connecting-ip': 'unknown' }],
  ])(
    'resolves nothing when the request reached Vercel through Cloudflare and cf-connecting-ip is %s',
    (_name, headers) => {
      expect(resolve({ 'x-forwarded-for': CLOUDFLARE_EGRESS_IP, ...headers })).toBeUndefined();
    }
  );

  it('resolves nothing when x-forwarded-for is not an ip address', () => {
    expect(resolve({ 'x-forwarded-for': 'unknown' })).toBeUndefined();
  });
});

describe('resolveTrustedClientIp off Vercel', () => {
  it.each([
    ['caller-written x-forwarded-for', { 'x-forwarded-for': SPOOFED_IP }],
    ['caller-written x-forwarded-for behind a private proxy', { 'x-forwarded-for': `${SPOOFED_IP}, 10.1.1.1` }],
    ['caller-written cf-connecting-ip', { 'cf-connecting-ip': SPOOFED_IP }],
    ['caller-written x-frontegg-forwarded-for', { 'x-frontegg-forwarded-for': SPOOFED_IP }],
  ])('forwards nothing without a configured source for %s', (_name, headers) => {
    expect(resolve(headers)).toBeUndefined();
  });
});

describe('resolveTrustedClientIp with a configured header', () => {
  beforeEach(() => {
    Object.assign(config, { clientIpHeader: 'x-real-ip' });
  });

  it('uses the rightmost value of the configured header', () => {
    expect(resolve({ 'x-real-ip': `${SPOOFED_IP}, ${CLIENT_IP}`, 'x-forwarded-for': SPOOFED_IP })).toBe(CLIENT_IP);
  });

  it('resolves nothing when the configured header is missing', () => {
    expect(resolve({ 'x-forwarded-for': CLIENT_IP })).toBeUndefined();
  });

  it('resolves nothing when the rightmost value is not an ip address', () => {
    expect(resolve({ 'x-real-ip': `${CLIENT_IP}, unknown` })).toBeUndefined();
  });

  it('takes precedence over the Vercel x-forwarded-for', () => {
    Object.assign(config, { isVercel: true });
    expect(resolve({ 'x-real-ip': CLIENT_IP, 'x-forwarded-for': SPOOFED_IP })).toBe(CLIENT_IP);
  });
});

describe('resolveTrustedClientIp with a custom ipResolver', () => {
  const resolveWith = (ipResolver: (request: any) => unknown, headers: Record<string, any> = {}) =>
    resolveTrustedClientIp({ headers }, ipResolver as any);

  it('uses the ipResolver off Vercel', () => {
    expect(resolveWith((request) => request.headers['x-client-ip'], { 'x-client-ip': `::ffff:${CLIENT_IP}` })).toBe(
      CLIENT_IP
    );
  });

  it('takes precedence over the configured header and Vercel', () => {
    Object.assign(config, { isVercel: true, clientIpHeader: 'x-real-ip' });
    expect(resolveWith(() => CLIENT_IP, { 'x-real-ip': SPOOFED_IP, 'x-forwarded-for': SPOOFED_IP })).toBe(CLIENT_IP);
  });

  it('uses the first entry of a list', () => {
    expect(resolveWith(() => `${CLIENT_IP}, ${PRIVATE_PROXY_IP}`)).toBe(CLIENT_IP);
  });

  it.each([
    ['a header array', [CLIENT_IP]],
    ['a number', 42],
    ['null', null],
  ])('resolves nothing when the ipResolver returns %s', (_name, resolvedValue) => {
    expect(resolveWith(() => resolvedValue)).toBeUndefined();
  });

  it('resolves nothing when the ipResolver throws', () => {
    const throwingResolver = () => {
      throw new Error('no socket');
    };
    expect(resolveWith(throwingResolver)).toBeUndefined();
  });

  it('is not used by calls without it', () => {
    Object.assign(config, { isVercel: true });
    resolveWith(() => SPOOFED_IP);
    expect(resolve({ 'x-forwarded-for': CLIENT_IP })).toBe(CLIENT_IP);
  });
});

describe('resolveTrustedClientIp when forwarding is off', () => {
  it('does not call the ipResolver', () => {
    const ipResolver = vi.fn(() => CLIENT_IP);
    Object.assign(config, { shouldForwardIp: false, isVercel: true });

    expect(resolveTrustedClientIp({ headers: { 'x-forwarded-for': CLIENT_IP } }, ipResolver)).toBeUndefined();
    expect(ipResolver).not.toHaveBeenCalled();
  });
});

describe('normalizeIp', () => {
  it.each([
    [CLIENT_IP, CLIENT_IP],
    [` ${CLIENT_IP} `, CLIENT_IP],
    [`::ffff:${CLIENT_IP}`, CLIENT_IP],
    [`::FFFF:${CLIENT_IP}`, CLIENT_IP],
    [`${PRIVATE_PROXY_IP}:51234`, PRIVATE_PROXY_IP],
    ['[2001:db8::1]', '2001:db8::1'],
    ['[2001:db8::1]:443', '2001:db8::1'],
    ['2001:DB8::1', '2001:db8::1'],
    ['::ffff:c633:6407', CLIENT_IP],
    ['2001:0db8:0000:0000:0000:0000:0000:0001', '2001:db8::1'],
    ['2001:db8:0:1:0:0:0:1', '2001:db8:0:1::1'],
    ['2001:db8:0:0:1:0:0:1', '2001:db8::1:0:0:1'],
    ['2001:db8:1:0:1:1:1:1', '2001:db8:1:0:1:1:1:1'],
    ['::1', '::1'],
    ['0.1.2.3', '0.1.2.3'],
  ])('normalizes %s to %s', (rawIp, expectedIp) => {
    expect(normalizeIp(rawIp)).toBe(expectedIp);
  });

  it.each([
    'unknown',
    'fe80::1%en0',
    '256.1.1.1',
    '1.2.3',
    '1:2:3:4:5:6:7:8:9',
    '010.1.1.1',
    '1.2.3.04',
    '::',
    '0.0.0.0',
    '::ffff:0.0.0.0',
    '',
    undefined,
    [CLIENT_IP],
  ])('rejects %s', (rawIp) => {
    expect(normalizeIp(rawIp)).toBeUndefined();
  });
});

describe('isCloudflareIp', () => {
  it.each(['172.70.1.1', '104.16.0.1', '2606:4700::1', '2a06:98c7::1'])('treats %s as Cloudflare', (ip) => {
    expect(isCloudflareIp(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '2a06:98c8::1', '10.0.0.1', 'not-an-ip'])('does not treat %s as Cloudflare', (ip) => {
    expect(isCloudflareIp(ip)).toBe(false);
  });
});

describe('headersToRecord', () => {
  it('copies a Headers instance', () => {
    expect(headersToRecord(new Headers({ 'X-Forwarded-For': CLIENT_IP }))).toEqual({ 'x-forwarded-for': CLIENT_IP });
  });

  it('returns an empty record when the request has no headers', () => {
    expect(headersToRecord(undefined)).toEqual({});
  });
});
