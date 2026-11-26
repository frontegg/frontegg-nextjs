// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

const CONFIG_BASE = vi.hoisted(() => ({
  appUrl: 'https://app.example.com',
  isHostedLogin: false,
  ipResolver: undefined as any,
}));

vi.mock('../../../src/config', () => ({ default: { ...CONFIG_BASE } }));
vi.mock('../../../src/middleware/FronteggProxy', () => ({ FronteggProxy: { web: vi.fn() } }));
vi.mock('../../../src/pages', () => ({ getSession: vi.fn() }));
vi.mock('../../../src/utils/cookies', () => ({ default: { getSessionCookieFromRequest: vi.fn() } }));
vi.mock('../../../src/utils/sessionTokens', () => ({ getTokensFromCookie: vi.fn() }));

import config from '../../../src/config';
import { FronteggProxy } from '../../../src/middleware/FronteggProxy';
import { getSession } from '../../../src/pages';
import CookieManager from '../../../src/utils/cookies';
import { getTokensFromCookie } from '../../../src/utils/sessionTokens';
import { FronteggApiMiddleware } from '../../../src/middleware';

const mockedWeb = vi.mocked(FronteggProxy.web);
const mockedGetSession = vi.mocked(getSession);
const mockedGetSessionCookie = vi.mocked(CookieManager.getSessionCookieFromRequest);
const mockedGetTokensFromCookie = vi.mocked(getTokensFromCookie);

const createReq = (url: string | undefined, headers: Record<string, string> = {}) => ({ url, headers }) as any;

const createRes = () => {
  const headers: Record<string, string> = {};
  return Object.assign(new EventEmitter(), {
    headers,
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    removeHeader: vi.fn((name: string) => {
      delete headers[name];
    }),
  }) as any;
};

/**
 * Resolves the middleware promise by simulating the proxy closing the response once it was handed the request.
 */
const run = async (handler: (req: any, res: any) => Promise<void>, req: any, res = createRes()) => {
  mockedWeb.mockImplementationOnce(((_req: any, response: any) => response.emit('close')) as any);
  await handler(req, res);
  return { res, proxyOptions: mockedWeb.mock.calls[0]?.[2] as any };
};

beforeEach(() => {
  Object.assign(config, CONFIG_BASE);
  vi.stubEnv('FRONTEGG_BASE_URL', 'https://auth.example.com');
  // pin the env flags the middleware branches on, so values from the host environment cannot leak in
  vi.stubEnv('FRONTEGG_TEST_URL', '');
  vi.stubEnv('FRONTEGG_SECURE_JWT_ENABLED', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('FronteggApiMiddleware routing', () => {
  it('strips the /api prefix and proxies to the frontegg base url', async () => {
    // Arrange
    const req = createReq('/api/frontegg/identity/resources/auth/v1/user');

    // Act
    const { proxyOptions } = await run(FronteggApiMiddleware, req);

    // Assert
    expect(req.url).toBe('/frontegg/identity/resources/auth/v1/user');
    expect(mockedWeb).toHaveBeenCalledWith(req, expect.anything(), {
      target: 'https://auth.example.com',
      headers: {},
    });
    expect(proxyOptions.headers).toEqual({});
  });

  it('rewrites the saml callback to the gateway route', async () => {
    const req = createReq('/api/frontegg/saml/callback');

    await run(FronteggApiMiddleware, req);

    expect(req.url).toBe('/auth/saml/callback');
  });

  it('treats a missing url as the root path', async () => {
    const req = createReq(undefined);

    await run(FronteggApiMiddleware, req);

    expect(req.url).toBe('/');
  });

  it('targets the test url for the middleware test route when configured', async () => {
    vi.stubEnv('FRONTEGG_TEST_URL', 'http://localhost:9999');

    const { proxyOptions } = await run(FronteggApiMiddleware, createReq('/api/frontegg/middleware-test'));

    expect(proxyOptions.target).toBe('http://localhost:9999');
  });

  it('keeps the base url for other routes even when a test url is configured', async () => {
    vi.stubEnv('FRONTEGG_TEST_URL', 'http://localhost:9999');

    const { proxyOptions } = await run(FronteggApiMiddleware, createReq('/api/frontegg/other'));

    expect(proxyOptions.target).toBe('https://auth.example.com');
  });
});

describe('FronteggApiMiddleware authorization header', () => {
  it('adds the session access token when secure jwt is enabled', async () => {
    // Arrange
    vi.stubEnv('FRONTEGG_SECURE_JWT_ENABLED', 'true');
    mockedGetSession.mockResolvedValue({ accessToken: 'session-token' } as any);
    const req = createReq('/api/frontegg/user');

    // Act
    const { res, proxyOptions } = await run(FronteggApiMiddleware, req);

    // Assert
    expect(mockedGetSession).toHaveBeenCalledWith(req, res);
    expect(proxyOptions.headers).toEqual({ authorization: 'Bearer session-token' });
  });

  it('omits the authorization header when there is no secure session', async () => {
    vi.stubEnv('FRONTEGG_SECURE_JWT_ENABLED', 'true');
    mockedGetSession.mockResolvedValue(undefined);

    const { proxyOptions } = await run(FronteggApiMiddleware, createReq('/api/frontegg/user'));

    expect(proxyOptions.headers).toEqual({});
  });

  it('does not read the session when secure jwt is disabled', async () => {
    await run(FronteggApiMiddleware, createReq('/api/frontegg/user'));

    expect(mockedGetSession).not.toHaveBeenCalled();
  });

  it('authorizes hosted logout with tokens from the session cookie', async () => {
    // Arrange
    Object.assign(config, { isHostedLogin: true });
    mockedGetSessionCookie.mockReturnValue('sealed-cookie');
    mockedGetTokensFromCookie.mockResolvedValue({ accessToken: 'cookie-token', refreshToken: 'r' });

    // Act
    const { proxyOptions } = await run(FronteggApiMiddleware, createReq('/api/frontegg/oauth/logout'));

    // Assert
    expect(mockedGetTokensFromCookie).toHaveBeenCalledWith('sealed-cookie');
    expect(proxyOptions.headers).toEqual({ authorization: 'Bearer cookie-token' });
  });

  it('sends hosted logout without authorization when the cookie holds no tokens', async () => {
    Object.assign(config, { isHostedLogin: true });
    mockedGetTokensFromCookie.mockResolvedValue(undefined);

    const { proxyOptions } = await run(FronteggApiMiddleware, createReq('/api/frontegg/oauth/logout'));

    expect(proxyOptions.headers).toEqual({});
  });

  it('prefers the secure session token over the cookie on hosted logout', async () => {
    Object.assign(config, { isHostedLogin: true });
    vi.stubEnv('FRONTEGG_SECURE_JWT_ENABLED', 'true');
    mockedGetSession.mockResolvedValue({ accessToken: 'session-token' } as any);

    const { proxyOptions } = await run(FronteggApiMiddleware, createReq('/api/frontegg/oauth/logout'));

    expect(mockedGetTokensFromCookie).not.toHaveBeenCalled();
    expect(proxyOptions.headers).toEqual({ authorization: 'Bearer session-token' });
  });

  it('does not read cookie tokens for non logout routes on hosted login', async () => {
    Object.assign(config, { isHostedLogin: true });

    await run(FronteggApiMiddleware, createReq('/api/frontegg/user'));

    expect(mockedGetTokensFromCookie).not.toHaveBeenCalled();
  });
});

describe('FronteggApiMiddleware.withOptions', () => {
  it('stores the ip resolver on the config', async () => {
    const ipResolver = () => '1.2.3.4';

    await run(FronteggApiMiddleware.withOptions({ ipResolver }), createReq('/api/frontegg/user'));

    expect(config.ipResolver).toBe(ipResolver);
  });

  it('applies the cors defaults to internal requests from an allowed origin', async () => {
    // Arrange
    const req = createReq('/api/frontegg/user', { host: 'app.example.com', origin: 'https://site.example.com' });

    // Act
    const { res } = await run(
      FronteggApiMiddleware.withOptions({ cors: { allowedOrigins: ['https://site.example.com'] } }),
      req
    );

    // Assert
    expect(res.headers).toEqual({
      'Access-Control-Allow-Origin': 'https://site.example.com',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type,Authorization,x-frontegg-framework,x-frontegg-sdk,frontegg-source,frontegg-requested-application-id',
      'Access-Control-Allow-Credentials': 'true',
    });
  });

  it('removes the allow origin header for an origin that is not allowed', async () => {
    const req = createReq('/api/frontegg/user', { host: 'app.example.com', origin: 'https://evil.com' });

    const { res } = await run(
      FronteggApiMiddleware.withOptions({ cors: { allowedOrigins: ['https://site.example.com'] } }),
      req
    );

    expect(res.removeHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin');
    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('applies custom methods, merged headers and disabled credentials', async () => {
    const req = createReq('/api/frontegg/user', { host: 'app.example.com' });

    const { res } = await run(
      FronteggApiMiddleware.withOptions({
        cors: { allowedMethods: ['GET'], allowedHeaders: ['X-Custom', 'Authorization'], allowCredentials: false },
      }),
      req
    );

    expect(res.headers['Access-Control-Allow-Methods']).toBe('GET');
    expect(res.headers['Access-Control-Allow-Headers'].split(',')).toEqual([
      'Content-Type',
      'Authorization',
      'x-frontegg-framework',
      'x-frontegg-sdk',
      'frontegg-source',
      'frontegg-requested-application-id',
      'X-Custom',
    ]);
    expect(res.headers['Access-Control-Allow-Credentials']).toBe('false');
    expect(res.removeHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin');
  });

  it('skips cors headers for requests to a foreign host', async () => {
    const req = createReq('/api/frontegg/user', { host: 'other.com', origin: 'https://other.com' });

    const { res } = await run(FronteggApiMiddleware.withOptions({ cors: {} }), req);

    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.removeHeader).not.toHaveBeenCalled();
  });

  it('skips cors handling when no cors options are given', async () => {
    const req = createReq('/api/frontegg/user', { host: 'app.example.com', origin: 'https://app.example.com' });

    const { res } = await run(FronteggApiMiddleware.withOptions({}), req);

    expect(res.setHeader).not.toHaveBeenCalled();
  });
});
