// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

const CONFIG_BASE = vi.hoisted(() => ({
  appUrl: 'https://app.example.com',
  baseUrl: 'https://auth.example.com',
  authRoutes: {} as Record<string, string>,
  cookieDomain: 'app.example.com',
  isHostedLogin: false,
}));

const logger = vi.hoisted(() => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }));

vi.mock('../../../src/utils/fronteggLogger', () => ({ default: { child: () => logger } }));
vi.mock('../../../src/config', () => ({ default: { ...CONFIG_BASE } }));
vi.mock('../../../src/utils/cookies', () => ({
  default: { removeCookies: vi.fn(), modifySetCookie: vi.fn(), create: vi.fn() },
}));
vi.mock('../../../src/common', () => ({ createSessionFromAccessToken: vi.fn() }));
vi.mock('../../../src/utils/refreshAccessTokenIfNeeded/helpers', () => ({ isSSOPostRequest: vi.fn(() => false) }));

import config from '../../../src/config';
import CookieManager from '../../../src/utils/cookies';
import { createSessionFromAccessToken } from '../../../src/common';
import { isSSOPostRequest } from '../../../src/utils/refreshAccessTokenIfNeeded/helpers';
import ProxyResponseCallback from '../../../src/middleware/ProxyResponseCallback';

const mockedRemoveCookies = vi.mocked(CookieManager.removeCookies);
const mockedModifySetCookie = vi.mocked(CookieManager.modifySetCookie);
const mockedCreateCookie = vi.mocked(CookieManager.create);
const mockedCreateSession = vi.mocked(createSessionFromAccessToken);
const mockedIsSSOPost = vi.mocked(isSSOPostRequest);

type FakeProxyRes = EventEmitter & { statusCode?: number; headers: Record<string, any> };

const createProxyRes = (statusCode: number | undefined, headers: Record<string, any> = {}): FakeProxyRes =>
  Object.assign(new EventEmitter(), { statusCode, headers });

const createRes = () => {
  const headers: Record<string, any> = {};
  const res: any = {
    headers,
    setHeader: vi.fn((name: string, value: any) => {
      headers[name] = value;
    }),
    status: vi.fn(() => res),
    end: vi.fn(),
  };
  return res;
};

const createReq = (url: string, headers: Record<string, any> = {}) => ({ url, headers });

/** Feeds the proxied body through the stream callbacks and waits for the async `end` handler to respond. */
const respond = async (proxyRes: FakeProxyRes, req: any, body?: string) => {
  const res = createRes();
  (ProxyResponseCallback as any)(proxyRes, req, res);
  if (body !== undefined) {
    const buffer = Buffer.from(body);
    const middle = Math.floor(buffer.length / 2);
    proxyRes.emit('data', buffer.subarray(0, middle));
    proxyRes.emit('data', buffer.subarray(middle));
  }
  proxyRes.emit('end');
  await vi.waitFor(() => expect(res.end).toHaveBeenCalled());
  return res;
};

beforeEach(() => {
  Object.assign(config, CONFIG_BASE);
  mockedModifySetCookie.mockReturnValue(['fe_refresh=abc']);
  mockedIsSSOPost.mockReturnValue(false);
  // pin the flag so a value from the host environment cannot change the forwarded bodies
  vi.stubEnv('FRONTEGG_SECURE_JWT_ENABLED', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ProxyResponseCallback logout', () => {
  it('clears session cookies and passes the response through for embedded logout', async () => {
    const req = createReq('/frontegg/identity/resources/auth/v1/logout');

    const res = await respond(createProxyRes(200), req, '{"ok":true}');

    expect(mockedRemoveCookies).toHaveBeenCalledWith({
      isSecured: true,
      cookieDomain: 'app.example.com',
      res,
      req,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalledWith('{"ok":true}');
  });

  it('marks cookies as not secured for http app urls', async () => {
    Object.assign(config, { appUrl: 'http://localhost:3000' });

    await respond(createProxyRes(200), createReq('/frontegg/logout'), '');

    expect(mockedRemoveCookies.mock.calls[0][0]).toMatchObject({ isSecured: false });
  });

  it('redirects to the hosted logout url for oauth logout', async () => {
    const req = createReq('/frontegg/oauth/logout', { referer: 'https://app.example.com/dashboard' });

    const res = await respond(createProxyRes(200), req, '');

    expect(res.status).toHaveBeenCalledWith(302);
    expect(res.end).toHaveBeenCalledWith(
      `https://auth.example.com/oauth/logout?post_logout_redirect_uri=${encodeURIComponent(
        'https://app.example.com/dashboard'
      )}`
    );
  });

  it('redirects to the hosted logout url for any logout when hosted login is enabled', async () => {
    Object.assign(config, { isHostedLogin: true });

    const res = await respond(createProxyRes(200), createReq('/frontegg/identity/resources/auth/v1/logout'), '');

    expect(res.status).toHaveBeenCalledWith(302);
    expect(res.end.mock.calls[0][0]).toContain('https://auth.example.com/oauth/logout?post_logout_redirect_uri=');
  });
});

describe('ProxyResponseCallback successful responses', () => {
  it('creates a session cookie from an access token in the body', async () => {
    const body = JSON.stringify({ accessToken: 'header.payload.sig', refreshToken: 'r' });
    const exp = 1_900_000_000;
    mockedCreateSession.mockResolvedValue(['sealed', { exp }, 'r'] as any);
    mockedCreateCookie.mockReturnValue(['fe_session=sealed']);
    const req = createReq('/frontegg/identity/resources/auth/v1/user');

    const res = await respond(createProxyRes(200, { 'content-type': 'application/json' }), req, body);

    expect(mockedCreateSession).toHaveBeenCalledWith({ accessToken: 'header.payload.sig', refreshToken: 'r' });
    expect(mockedCreateCookie).toHaveBeenCalledWith({
      value: 'sealed',
      expires: new Date(exp * 1000),
      secure: true,
      req,
    });
    expect(res.headers['set-cookie']).toEqual(['fe_refresh=abc', 'fe_session=sealed']);
    expect(res.headers['content-type']).toBe('application/json');
    expect(res.headers['content-length']).toBe(Buffer.byteLength(body));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalledWith(body);
  });

  it('strips jwt signatures from the forwarded body when secure jwt is enabled', async () => {
    vi.stubEnv('FRONTEGG_SECURE_JWT_ENABLED', 'true');
    mockedCreateSession.mockResolvedValue(['sealed', { exp: 1 }, 'r'] as any);
    mockedCreateCookie.mockReturnValue(['fe_session=sealed']);
    const body = JSON.stringify({ accessToken: 'h.payload.s', refreshToken: 'r' });

    const res = await respond(createProxyRes(200), createReq('/frontegg/user'), body);

    const expectedBody = JSON.stringify({ accessToken: 'REDACTED_FOR_SECURITY.payload.REDACTED_FOR_SECURITY' });
    // the session is still sealed from the original, unredacted tokens
    expect(mockedCreateSession).toHaveBeenCalledWith({ accessToken: 'h.payload.s', refreshToken: 'r' });
    expect(res.end).toHaveBeenCalledWith(expectedBody);
    expect(res.headers['content-length']).toBe(Buffer.byteLength(expectedBody));
  });

  it('does not add a session cookie when no session could be sealed', async () => {
    mockedCreateSession.mockResolvedValue([] as any);

    const res = await respond(createProxyRes(200), createReq('/frontegg/user'), '{"access_token":"t"}');

    expect(mockedCreateCookie).not.toHaveBeenCalled();
    expect(res.headers['set-cookie']).toEqual(['fe_refresh=abc']);
  });

  it('passes through bodies without tokens', async () => {
    const res = await respond(createProxyRes(201), createReq('/frontegg/tenants'), '{"items":[]}');

    expect(mockedCreateSession).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.end).toHaveBeenCalledWith('{"items":[]}');
  });

  it('passes through an empty body without parsing it', async () => {
    const res = await respond(createProxyRes(204), createReq('/frontegg/tenants'));

    expect(mockedCreateSession).not.toHaveBeenCalled();
    expect(res.headers['content-length']).toBe(0);
    expect(res.end).toHaveBeenCalledWith('');
  });

  it('uses an empty cookie list when upstream sets no cookies', async () => {
    mockedModifySetCookie.mockReturnValue(undefined as any);

    const res = await respond(createProxyRes(200), createReq('/frontegg/tenants'), '{}');

    expect(res.headers['set-cookie']).toEqual([]);
  });

  it('does not forward connection-level framing headers, since the body is re-sent with its own length', async () => {
    // A chunked upstream response
    const upstreamHeaders = {
      'transfer-encoding': 'chunked',
      connection: 'keep-alive',
      'keep-alive': 'timeout=5',
      'content-type': 'application/json',
    };

    const res = await respond(createProxyRes(200, upstreamHeaders), createReq('/frontegg/tenants'), '{"a":1}');

    expect(res.headers['transfer-encoding']).toBeUndefined();
    expect(res.headers['connection']).toBeUndefined();
    expect(res.headers['keep-alive']).toBeUndefined();
    expect(res.headers['content-type']).toBe('application/json');
    expect(res.headers['content-length']).toBe(Buffer.byteLength('{"a":1}'));
  });

  it('does not forward framing headers on failed responses either', async () => {
    const upstreamHeaders = { 'transfer-encoding': 'chunked', 'content-length': '999' };

    const res = await respond(createProxyRes(401, upstreamHeaders), createReq('/frontegg/tenants'), '{}');

    expect(res.headers['transfer-encoding']).toBeUndefined();
    expect(res.headers['content-length']).toBeUndefined();
  });

  it('never forwards a cookie header from upstream', async () => {
    const res = await respond(createProxyRes(200, { cookie: 'secret=1', 'x-custom': 'v' }), createReq('/x'), '{}');

    expect(res.headers['cookie']).toBeUndefined();
    expect(res.headers['x-custom']).toBe('v');
  });

  it('logs and still responds when the body is not json', async () => {
    const res = await respond(createProxyRes(200), createReq('/frontegg/page'), '<html></html>');

    expect(logger.error).toHaveBeenCalledWith('failed to create session', expect.any(Error), {
      url: '/frontegg/page',
      statusCode: 200,
    });
    expect(res.end).toHaveBeenCalledWith('<html></html>');
  });

  it('silently ignores a non json redirect from an sso post login', async () => {
    mockedIsSSOPost.mockReturnValue(true);

    const res = await respond(createProxyRes(302, { location: '/' }), createReq('/frontegg/auth/saml/callback'), 'x');

    expect(logger.error).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(302);
  });

  it('logs a non json redirect that is not an sso post login', async () => {
    await respond(createProxyRes(302), createReq('/frontegg/other'), 'x');

    expect(mockedIsSSOPost).toHaveBeenCalledWith('/frontegg/other');
    expect(logger.error).toHaveBeenCalledWith('failed to create session', expect.any(Error), expect.anything());
  });
});

describe('ProxyResponseCallback failed responses', () => {
  it('forwards client errors with headers and cookies and logs them', async () => {
    const req = createReq('/frontegg/identity/resources/auth/v1/user');

    const res = await respond(createProxyRes(401, { 'x-trace': 't', cookie: 'c' }), req, '{"errors":["no"]}');

    expect(res.headers['x-trace']).toBe('t');
    expect(res.headers['cookie']).toBeUndefined();
    expect(res.headers['set-cookie']).toEqual(['fe_refresh=abc']);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.end).toHaveBeenCalledWith('{"errors":["no"]}');
    expect(logger.error).toHaveBeenCalledWith(
      'Middleware request failed statusCode: 401 for url: /frontegg/identity/resources/auth/v1/user'
    );
    expect(mockedCreateSession).not.toHaveBeenCalled();
  });

  it('does not log not found responses', async () => {
    const res = await respond(createProxyRes(404), createReq('/frontegg/missing'), 'nope');

    expect(logger.error).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('treats a missing upstream status code as a server error', async () => {
    const res = await respond(createProxyRes(undefined), createReq('/frontegg/x'), 'boom');

    expect(res.status).toHaveBeenCalledWith(500);
    expect(logger.error).toHaveBeenCalledWith('Middleware request failed statusCode: 500 for url: /frontegg/x');
  });

  it('responds with 500 when handling the response throws', async () => {
    mockedModifySetCookie.mockImplementation(() => {
      throw new Error('bad set-cookie');
    });

    const res = await respond(createProxyRes(200), createReq('/frontegg/x'), '{}');

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.end).toHaveBeenCalledWith('Internal Server Error');
    expect(logger.error).toHaveBeenCalledWith('proxy failed to send request', expect.any(Error));
  });
});
