// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const CONFIG_BASE = vi.hoisted(() => ({
  cookieName: 'fe_session',
  rewriteCookieByAppId: false,
  appId: undefined as string | undefined,
  clientId: 'client-id-1234',
  ipResolver: undefined as ((req: any) => string | undefined) | undefined,
  isVercel: false,
  shouldForwardIp: false,
  sharedSecret: undefined as string | undefined,
}));

vi.mock('../../../src/config', () => ({ default: { ...CONFIG_BASE } }));
vi.mock('../../../src/utils/cookies', () => ({ default: { parseCookieHeader: vi.fn() } }));

import NextJsPkg from 'next/package.json';
import config from '../../../src/config';
import CookieManager from '../../../src/utils/cookies';
import sdkVersion from '../../../src/sdkVersion';
import ProxyRequestCallback from '../../../src/middleware/ProxyRequestCallback';
import { headersToRemove } from '../../../src/middleware/constants';

const mockedParseCookies = vi.mocked(CookieManager.parseCookieHeader);

const createProxyReq = () => {
  const headers: Record<string, any> = {};
  return {
    headers,
    setHeader: vi.fn((name: string, value: any) => {
      headers[name] = value;
    }),
    removeHeader: vi.fn(),
    write: vi.fn(),
  };
};

const createReq = (overrides: Record<string, any> = {}) => ({
  url: '/frontegg/identity/resources/auth/v1/user',
  method: 'GET',
  headers: {} as Record<string, any>,
  ...overrides,
});

const invoke = (proxyReq: ReturnType<typeof createProxyReq>, req: any) =>
  (ProxyRequestCallback as any)(proxyReq, req, {}, {});

beforeEach(() => {
  Object.assign(config, CONFIG_BASE);
  mockedParseCookies.mockReturnValue({});
});

describe('ProxyRequestCallback cookies', () => {
  it('forwards only fe_ cookies that are not the session cookie', () => {
    mockedParseCookies.mockReturnValue({
      fe_refresh_abc: 'refresh',
      fe_device_abc: 'device',
      fe_session: 'encrypted',
      'fe_session-1': 'encrypted-chunk',
      other: 'x',
    });
    const proxyReq = createProxyReq();

    invoke(proxyReq, createReq());

    expect(proxyReq.headers['cookie']).toBe('fe_refresh_abc=refresh; fe_device_abc=device; ');
  });

  it('sends an empty cookie header when no frontegg cookies exist', () => {
    const proxyReq = createProxyReq();

    invoke(proxyReq, createReq());

    expect(proxyReq.headers['cookie']).toBe('');
  });

  it('renames app id based cookies to client id based cookies when rewriting by app id', () => {
    Object.assign(config, { rewriteCookieByAppId: true, appId: 'app-id-99', clientId: 'client-id-1234' });
    mockedParseCookies.mockReturnValue({ 'fe_refresh_appid-99': 'r', fe_device_appid99: 'd' });
    const proxyReq = createProxyReq();

    invoke(proxyReq, createReq());

    expect(proxyReq.headers['cookie']).toBe('fe_refresh_clientid-1234=r; fe_device_clientid1234=d; ');
  });

  it('does not rename cookies when rewriting is enabled without an app id', () => {
    Object.assign(config, { rewriteCookieByAppId: true, appId: undefined });
    mockedParseCookies.mockReturnValue({ fe_refresh_x: 'r' });
    const proxyReq = createProxyReq();

    invoke(proxyReq, createReq());

    expect(proxyReq.headers['cookie']).toBe('fe_refresh_x=r; ');
  });
});

describe('ProxyRequestCallback headers', () => {
  it('sets default sdk identification headers and asks for an uncompressed response', () => {
    const proxyReq = createProxyReq();

    invoke(proxyReq, createReq());

    expect(proxyReq.headers['x-frontegg-framework']).toBe(`next@${NextJsPkg.version}`);
    expect(proxyReq.headers['x-frontegg-sdk']).toBe(`@frontegg/nextjs@${sdkVersion.version}`);
    expect(proxyReq.headers['x-frontegg-middleware']).toBe('true');
    expect(proxyReq.headers['Accept-Encoding']).toBe('identity');
  });

  it('keeps framework and sdk headers sent by the client', () => {
    const proxyReq = createProxyReq();
    const req = createReq({ headers: { 'x-frontegg-framework': 'custom-fw', 'x-frontegg-sdk': 'custom-sdk' } });

    invoke(proxyReq, req);

    expect(proxyReq.headers['x-frontegg-framework']).toBe('custom-fw');
    expect(proxyReq.headers['x-frontegg-sdk']).toBe('custom-sdk');
  });

  it('removes every next.js internal and security header before proxying', () => {
    const proxyReq = createProxyReq();

    invoke(proxyReq, createReq());

    expect(proxyReq.removeHeader.mock.calls.map(([h]) => h)).toEqual(headersToRemove);
  });
});

describe('ProxyRequestCallback client ip forwarding', () => {
  it('forwards the ip from a custom ip resolver when forwarding is enabled', () => {
    const ipResolver = vi.fn(() => '10.0.0.1');
    Object.assign(config, { ipResolver, shouldForwardIp: true, sharedSecret: 'shh' });
    const proxyReq = createProxyReq();
    const req = createReq();

    invoke(proxyReq, req);

    expect(ipResolver).toHaveBeenCalledWith(req);
    expect(proxyReq.headers['x-frontegg-forwarded-for']).toBe('10.0.0.1');
    expect(proxyReq.headers['x-frontegg-headers-verifier']).toBe('shh');
    expect(proxyReq.headers['frontegg-vendor-id']).toBe('client-id-1234');
  });

  it('sends an empty verifier when no shared secret is configured', () => {
    Object.assign(config, { ipResolver: () => '10.0.0.1', shouldForwardIp: true, sharedSecret: undefined });
    const proxyReq = createProxyReq();

    invoke(proxyReq, createReq());

    expect(proxyReq.headers['x-frontegg-headers-verifier']).toBe('');
  });

  it('resolves the ip from cloudflare header on vercel', () => {
    Object.assign(config, { isVercel: true, shouldForwardIp: true });
    const proxyReq = createProxyReq();

    invoke(proxyReq, createReq({ headers: { 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' } }));

    expect(proxyReq.headers['x-frontegg-forwarded-for']).toBe('1.1.1.1');
  });

  it('falls back to the first x-forwarded-for ip on vercel when cloudflare header is missing', () => {
    Object.assign(config, { isVercel: true, shouldForwardIp: true });
    const proxyReq = createProxyReq();

    invoke(proxyReq, createReq({ headers: { 'x-forwarded-for': '2.2.2.2, 3.3.3.3' } }));

    expect(proxyReq.headers['x-frontegg-forwarded-for']).toBe('2.2.2.2');
  });

  it('does not forward the ip when forwarding is disabled', () => {
    Object.assign(config, { ipResolver: () => '10.0.0.1', shouldForwardIp: false });
    const proxyReq = createProxyReq();

    invoke(proxyReq, createReq());

    expect(proxyReq.headers['x-frontegg-forwarded-for']).toBeUndefined();
  });

  it('does not forward the ip when none can be resolved', () => {
    Object.assign(config, { shouldForwardIp: true });
    const proxyReq = createProxyReq();

    invoke(proxyReq, createReq({ headers: { 'x-forwarded-for': '2.2.2.2' } }));

    // proxy headers are only trusted on vercel or through a custom ip resolver
    expect(proxyReq.headers['x-frontegg-forwarded-for']).toBeUndefined();
  });
});

describe('ProxyRequestCallback body', () => {
  it('re-serializes a parsed body as json for non GET requests', () => {
    const proxyReq = createProxyReq();
    const body = { email: 'ü@example.com' };

    invoke(proxyReq, createReq({ method: 'POST', body }));

    const serialized = JSON.stringify(body);
    expect(proxyReq.headers['Content-Type']).toBe('application/json');
    expect(proxyReq.headers['Content-Length']).toBe(Buffer.byteLength(serialized));
    expect(proxyReq.write).toHaveBeenCalledWith(serialized);
  });

  it('does not write a body for GET requests', () => {
    const proxyReq = createProxyReq();

    invoke(proxyReq, createReq({ method: 'GET', body: { a: 1 } }));

    expect(proxyReq.write).not.toHaveBeenCalled();
  });

  it('does not write a body when the request has none', () => {
    const proxyReq = createProxyReq();

    invoke(proxyReq, createReq({ method: 'POST', body: undefined }));

    expect(proxyReq.write).not.toHaveBeenCalled();
  });
});

describe('ProxyRequestCallback failures', () => {
  it('swallows errors so the proxy keeps running', () => {
    mockedParseCookies.mockImplementation(() => {
      throw new Error('bad cookie');
    });
    const proxyReq = createProxyReq();

    expect(() => invoke(proxyReq, createReq())).not.toThrow();
    expect(proxyReq.setHeader).not.toHaveBeenCalled();
  });
});
