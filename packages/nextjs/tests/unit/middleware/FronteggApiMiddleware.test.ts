import { EventEmitter } from 'events';
import { describe, it, expect, vi, beforeEach } from 'vitest';
// @ts-expect-error http-proxy ships no types for its internal passes
import { XHeaders } from 'http-proxy/lib/http-proxy/passes/web-incoming';

vi.mock('../../../src/config', () => ({
  default: {
    cookieName: 'fe_session',
    rewriteCookieByAppId: false,
    appId: undefined,
    clientId: 'vendor-id',
    sharedSecret: 'shared-secret',
    shouldForwardIp: true,
    isVercel: false,
    clientIpHeader: undefined,
    isHostedLogin: false,
  },
}));
vi.mock('../../../src/middleware/FronteggProxy', () => ({ FronteggProxy: { web: vi.fn() } }));
vi.mock('../../../src/pages', () => ({ getSession: vi.fn() }));
vi.mock('../../../src/common', () => ({ getTokensFromCookie: vi.fn() }));
vi.mock('../../../src/utils/cookies', () => ({
  default: { parseCookieHeader: () => ({}), getSessionCookieFromRequest: vi.fn() },
}));

import config from '../../../src/config';
import { FronteggProxy } from '../../../src/middleware/FronteggProxy';
import { FronteggApiMiddleware } from '../../../src/middleware';
import ProxyRequestCallback from '../../../src/middleware/ProxyRequestCallback';
import { resolveTrustedClientIp } from '../../../src/api/utils';

const CLIENT_IP = '198.51.100.7';
const LOAD_BALANCER_IP = '::ffff:10.0.0.5';
const LOGIN_BODY = { email: 'user@example.com' };

let outgoingHeaders: Record<string, unknown>;
const proxyReq = {
  setHeader: (name: string, value: unknown) => {
    outgoingHeaders[name.toLowerCase()] = value;
  },
  removeHeader: (name: string) => {
    delete outgoingHeaders[name.toLowerCase()];
  },
  write: vi.fn(),
};

// Same order as http-proxy: the XHeaders pass mutates req.headers, then the stream pass emits proxyReq
vi.mocked(FronteggProxy.web).mockImplementation(((req: any, res: any, options: any) => {
  XHeaders(req, res, { xfwd: true });
  outgoingHeaders = { ...req.headers };
  ProxyRequestCallback(proxyReq as any, req, res, options);
  res.emit('close');
}) as any);

const proxyLoginRequest = async (headers: Record<string, string>, ipResolver?: (request: any) => any) => {
  const req = {
    url: '/api/frontegg/identity/resources/auth/v1/user',
    method: 'POST',
    headers: { host: 'app.example.com', ...headers },
    connection: { remoteAddress: LOAD_BALANCER_IP },
    socket: { remoteAddress: LOAD_BALANCER_IP },
    body: LOGIN_BODY,
  };
  const res = Object.assign(new EventEmitter(), { setHeader: vi.fn(), removeHeader: vi.fn() });
  const middleware = ipResolver ? FronteggApiMiddleware.withOptions({ ipResolver }) : FronteggApiMiddleware;
  await middleware(req as any, res as any);
  return { req, forwardedIp: outgoingHeaders['x-frontegg-forwarded-for'] };
};

beforeEach(() => {
  Object.assign(config, { isVercel: false, clientIpHeader: undefined, shouldForwardIp: true });
});

describe('FronteggApiMiddleware client ip forwarding', () => {
  it('forwards the client ip from x-forwarded-for as it arrived, before http-proxy appends the load balancer', async () => {
    Object.assign(config, { clientIpHeader: 'x-forwarded-for' });

    const { req, forwardedIp } = await proxyLoginRequest({ 'x-forwarded-for': CLIENT_IP });

    expect(req.headers['x-forwarded-for']).toBe(`${CLIENT_IP},${LOAD_BALANCER_IP}`);
    expect(forwardedIp).toBe(CLIENT_IP);
    expect(outgoingHeaders['x-frontegg-headers-verifier']).toBe('shared-secret');
  });

  it('forwards the first entry of a list returned by the ipResolver', async () => {
    const { forwardedIp } = await proxyLoginRequest(
      { 'x-forwarded-for': `${CLIENT_IP}, 10.0.0.1` },
      (request) => request.headers['x-forwarded-for']
    );

    expect(forwardedIp).toBe(CLIENT_IP);
  });

  it.each([
    ['returns a header array', () => [CLIENT_IP]],
    [
      'throws',
      () => {
        throw new Error('no socket');
      },
    ],
  ])('still proxies the request body when the ipResolver %s', async (_name, ipResolver) => {
    const { forwardedIp } = await proxyLoginRequest({}, ipResolver);

    expect(forwardedIp).toBeUndefined();
    expect(proxyReq.write).toHaveBeenCalledWith(JSON.stringify(LOGIN_BODY));
  });

  it('does not make the ipResolver a source for the other paths', async () => {
    Object.assign(config, { isVercel: true });
    const ipResolver = vi.fn(() => '203.0.113.20');

    const { forwardedIp } = await proxyLoginRequest({ 'x-forwarded-for': CLIENT_IP }, ipResolver);

    expect(forwardedIp).toBe('203.0.113.20');
    expect(resolveTrustedClientIp({ headers: { 'x-forwarded-for': CLIENT_IP } })).toBe(CLIENT_IP);
    expect(ipResolver).toHaveBeenCalledTimes(1);
  });
});
