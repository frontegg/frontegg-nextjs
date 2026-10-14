import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/config', () => ({
  default: {
    isVercel: false,
    forwardIpHeader: undefined,
  },
}));

import config from '../../../src/config';
import { resolveTrustedClientIp } from '../../../src/api/utils';
import { isCloudflareIp, isPrivateIp } from '../../../src/utils/clientIp';

const CLIENT_IP = '198.51.100.7';
const SPOOFED_IP = '6.6.6.6';
const CLOUDFLARE_EGRESS_IP = '172.70.1.1';
const PRIVATE_PROXY_IP = '10.0.0.5';

beforeEach(() => {
  Object.assign(config, { isVercel: false, forwardIpHeader: undefined });
});

describe('resolveTrustedClientIp on Vercel', () => {
  beforeEach(() => {
    Object.assign(config, { isVercel: true });
  });

  it('uses the x-forwarded-for that Vercel overwrites', () => {
    expect(resolveTrustedClientIp({ 'x-forwarded-for': CLIENT_IP })).toBe(CLIENT_IP);
  });

  it('ignores a cf-connecting-ip sent by the caller', () => {
    expect(resolveTrustedClientIp({ 'x-forwarded-for': CLIENT_IP, 'cf-connecting-ip': SPOOFED_IP })).toBe(CLIENT_IP);
  });

  it('uses cf-connecting-ip when the request reached Vercel through Cloudflare', () => {
    expect(resolveTrustedClientIp({ 'x-forwarded-for': CLOUDFLARE_EGRESS_IP, 'cf-connecting-ip': CLIENT_IP })).toBe(
      CLIENT_IP
    );
  });
});

describe('resolveTrustedClientIp when self-hosted', () => {
  it('takes the hop appended by a private proxy and ignores entries sent by the caller', () => {
    const headers = { 'x-forwarded-for': `${SPOOFED_IP}, ${CLIENT_IP}` };
    expect(resolveTrustedClientIp(headers, PRIVATE_PROXY_IP)).toBe(CLIENT_IP);
  });

  it('skips a chain of private proxies', () => {
    const headers = { 'x-forwarded-for': `${SPOOFED_IP}, ${CLIENT_IP}, 10.0.0.9` };
    expect(resolveTrustedClientIp(headers, `::ffff:${PRIVATE_PROXY_IP}`)).toBe(CLIENT_IP);
  });

  it('uses cf-connecting-ip when Cloudflare sits in front of the private proxy', () => {
    const headers = {
      'x-forwarded-for': `${SPOOFED_IP}, ${CLIENT_IP}, ${CLOUDFLARE_EGRESS_IP}`,
      'cf-connecting-ip': CLIENT_IP,
    };
    expect(resolveTrustedClientIp(headers, PRIVATE_PROXY_IP)).toBe(CLIENT_IP);
  });

  it('uses the peer address of a directly exposed server and ignores headers sent by the caller', () => {
    const headers = { 'x-forwarded-for': SPOOFED_IP, 'cf-connecting-ip': SPOOFED_IP };
    expect(resolveTrustedClientIp(headers, CLIENT_IP)).toBe(CLIENT_IP);
  });

  it('takes the rightmost public hop when the peer address is not available', () => {
    expect(resolveTrustedClientIp({ 'x-forwarded-for': `${SPOOFED_IP}, ${CLIENT_IP}` })).toBe(CLIENT_IP);
  });

  it('never reads the x-frontegg-forwarded-for header sent by the caller', () => {
    expect(resolveTrustedClientIp({ 'x-frontegg-forwarded-for': SPOOFED_IP })).toBeUndefined();
  });

  it('resolves nothing when every hop is a private address', () => {
    expect(resolveTrustedClientIp({ 'x-forwarded-for': '10.0.0.9' }, '127.0.0.1')).toBeUndefined();
  });
});

describe('resolveTrustedClientIp with a configured header', () => {
  it('uses the rightmost value of the configured header', () => {
    Object.assign(config, { forwardIpHeader: 'x-real-ip' });
    expect(resolveTrustedClientIp({ 'x-real-ip': `${SPOOFED_IP}, ${CLIENT_IP}`, 'x-forwarded-for': SPOOFED_IP })).toBe(
      CLIENT_IP
    );
  });

  it('falls back to the proxy hops when the configured header is missing', () => {
    Object.assign(config, { forwardIpHeader: 'x-real-ip' });
    expect(resolveTrustedClientIp({ 'x-forwarded-for': CLIENT_IP }, PRIVATE_PROXY_IP)).toBe(CLIENT_IP);
  });
});

describe('ip ranges', () => {
  it.each(['10.1.2.3', '172.16.0.1', '192.168.1.1', '127.0.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1'])(
    'treats %s as private',
    (ip) => {
      expect(isPrivateIp(ip)).toBe(true);
    }
  );

  it.each(['8.8.8.8', '172.32.0.1', '2001:db8::1', 'not-an-ip', ''])('treats %s as public or invalid', (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });

  it.each(['172.70.1.1', '104.16.0.1', '2606:4700::1', '2a06:98c7::1'])('treats %s as Cloudflare', (ip) => {
    expect(isCloudflareIp(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '2a06:98c8::1', '10.0.0.1'])('does not treat %s as Cloudflare', (ip) => {
    expect(isCloudflareIp(ip)).toBe(false);
  });
});
