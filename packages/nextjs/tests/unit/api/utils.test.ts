import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const CONFIG_DEFAULTS = {
  baseUrl: 'https://auth.example.com',
  clientId: 'client-id',
  appId: undefined as string | undefined,
  rewriteCookieByAppId: false,
  shouldForwardIp: false,
  sharedSecret: 'shared-secret' as string | undefined,
};

const mockConfig = vi.hoisted(() => ({}) as Record<string, unknown>);

vi.mock('../../../src/config', () => ({ default: mockConfig }));

import {
  Get,
  Post,
  removeInvalidHeaders,
  buildRequestHeaders,
  parseHttpResponse,
  isMiddlewarePath,
  getClientIp,
  CUSTOM_LOGIN_HEADER,
  FRONTEGG_APPLICATION_ID_HEADER,
  FRONTEGG_FORWARD_IP_HEADER,
  FRONTEGG_HEADERS_VERIFIER_HEADER,
  FRONTEGG_VENDOR_ID_HEADER,
} from '../../../src/api/utils';
import sdkVersion from '../../../src/sdkVersion';
import nextjsPkg from 'next/package.json';

const fetchMock = vi.fn();

beforeEach(() => {
  Object.keys(mockConfig).forEach((key) => delete mockConfig[key]);
  Object.assign(mockConfig, CONFIG_DEFAULTS);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response('{}'));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Get', () => {
  it('sends a GET request with credentials included by default', async () => {
    // Arrange
    const headers = { a: 'b' };

    // Act
    await Get({ url: 'https://x.test/path', headers });

    // Assert
    expect(fetchMock).toHaveBeenCalledWith('https://x.test/path', {
      method: 'GET',
      credentials: 'include',
      headers,
    });
  });

  it('respects an explicit credentials option', async () => {
    await Get({ url: 'https://x.test', credentials: 'omit' });

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'omit' });
  });
});

describe('Post', () => {
  it('sends a POST request with the body and credentials included by default', async () => {
    await Post({ url: 'https://x.test/post', body: '{"a":1}', headers: { h: 'v' } });

    expect(fetchMock).toHaveBeenCalledWith('https://x.test/post', {
      method: 'POST',
      credentials: 'include',
      headers: { h: 'v' },
      body: '{"a":1}',
    });
  });

  it('respects an explicit credentials option', async () => {
    await Post({ url: 'https://x.test', body: '', credentials: 'same-origin' });

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'same-origin' });
  });
});

describe('removeInvalidHeaders', () => {
  it('keeps valid string headers untouched', () => {
    const input = { accept: 'application/json', 'x-custom': 'value' };

    const result = removeInvalidHeaders(input);

    expect(result).toEqual(input);
  });

  it('returns a new object and does not mutate the input', () => {
    const input: Record<string, any> = { ok: 'yes', bad: undefined };

    const result = removeInvalidHeaders(input);

    expect(result).not.toBe(input);
    expect(input).toHaveProperty('bad');
    expect(result).not.toHaveProperty('bad');
  });

  it('removes headers whose value is a plain object', () => {
    const result = removeInvalidHeaders({ ok: 'yes', obj: { nested: 'x' } as any });

    expect(result).toEqual({ ok: 'yes' });
  });

  it('keeps headers whose value is an array of valid strings', () => {
    const result = removeInvalidHeaders({ list: ['a', 'b'] as any });

    expect(result).toEqual({ list: ['a', 'b'] });
  });

  it('removes headers containing invalid characters such as newlines', () => {
    const result = removeInvalidHeaders({ ok: 'yes', injected: 'value\r\nx-evil: 1' });

    expect(result).toEqual({ ok: 'yes' });
  });

  it('removes undefined and null headers', () => {
    const result = removeInvalidHeaders({ ok: 'yes', u: undefined as any, n: null as any });

    expect(result).toEqual({ ok: 'yes' });
  });

  it('removes the hop-by-hop connection header', () => {
    const result = removeInvalidHeaders({ ok: 'yes', connection: 'keep-alive' });

    expect(result).toEqual({ ok: 'yes' });
  });
});

describe('buildRequestHeaders', () => {
  it('forwards known request headers and adds frontegg sdk identification headers', () => {
    // Arrange
    const incoming = {
      authorization: 'Bearer token',
      'accept-encoding': 'gzip',
      'accept-language': 'en',
      accept: '*/*',
      'user-agent': 'jest',
      'cache-control': 'no-cache',
      'x-not-forwarded': 'dropped',
    };

    // Act
    const result = buildRequestHeaders(incoming);

    // Assert
    expect(result).toEqual({
      authorization: 'Bearer token',
      'accept-encoding': 'gzip',
      'accept-language': 'en',
      accept: '*/*',
      'content-type': 'application/json',
      origin: 'https://auth.example.com',
      'user-agent': 'jest',
      'cache-control': 'no-cache',
      'x-frontegg-framework': `next@${nextjsPkg.version}`,
      'x-frontegg-sdk': `@frontegg/nextjs@${sdkVersion.version}`,
    });
  });

  it('omits headers that were not present on the incoming request', () => {
    const result = buildRequestHeaders({});

    expect(Object.keys(result).sort()).toEqual(
      ['content-type', 'origin', 'x-frontegg-framework', 'x-frontegg-sdk'].sort()
    );
  });

  describe('string cookie header', () => {
    it('strips an fe_session cookie located in the middle of the cookie string', () => {
      const result = buildRequestHeaders({ cookie: 'a=1; fe_session-abc=sealed; b=2' });

      expect(result.cookie).not.toContain('fe_session');
      expect(result.cookie).toContain('a=1');
      expect(result.cookie).toContain('b=2');
    });

    it('strips an fe_session cookie located at the end of the cookie string', () => {
      const result = buildRequestHeaders({ cookie: 'a=1; fe_session-abc=sealed' });

      expect(result.cookie).not.toContain('fe_session');
      expect(result.cookie).toContain('a=1');
    });

    it('leaves unrelated cookies untouched when no rewrite is configured', () => {
      const result = buildRequestHeaders({ cookie: 'fe_refresh_clientid=r1; other=x' });

      expect(result.cookie).toBe('fe_refresh_clientid=r1; other=x');
    });

    /**
     * SUSPECTED BUG (src/api/utils.ts buildRequestHeaders): the refresh cookie names are built with
     * `id.replace('-', '')`, which strips only the FIRST dash, while src/utils/cookies uses
     * `replace(/-/g, '')`. The ids below ('client-id', 'app-id') have a single dash, so these rewrite
     * tests pass; with a real multi-dash UUID the rewrite would not match the browser's cookie names.
     */
    it('renames the app refresh cookie to the client refresh cookie when rewriteCookieByAppId is on', () => {
      // Arrange
      Object.assign(mockConfig, { rewriteCookieByAppId: true, appId: 'app-id' });

      // Act
      const result = buildRequestHeaders({
        cookie: 'fe_refresh_clientid=stale; fe_refresh_appid=fresh; other=x',
      });

      // Assert
      expect(result.cookie).toContain('fe_refresh_clientid=fresh');
      expect(result.cookie).not.toContain('stale');
      expect(result.cookie).not.toContain('fe_refresh_appid');
      expect(result.cookie).toContain('other=x');
    });

    it('does not rewrite cookies when rewriteCookieByAppId is on but appId is missing', () => {
      Object.assign(mockConfig, { rewriteCookieByAppId: true, appId: undefined });

      const result = buildRequestHeaders({ cookie: 'fe_refresh_clientid=r1; fe_refresh_appid=r2' });

      expect(result.cookie).toBe('fe_refresh_clientid=r1; fe_refresh_appid=r2');
    });
  });

  describe('object cookie header', () => {
    it('serializes a cookie object into a cookie header string', () => {
      const result = buildRequestHeaders({ cookie: { a: '1', b: '2' } });

      expect(result.cookie).toBe('a=1; b=2');
    });

    it('drops the client refresh cookie and renames the app refresh cookie when rewriteCookieByAppId is on', () => {
      // Arrange
      Object.assign(mockConfig, { rewriteCookieByAppId: true, appId: 'app-id' });

      // Act
      const result = buildRequestHeaders({
        cookie: { a: '1', fe_refresh_clientid: 'stale', fe_refresh_appid: 'fresh' },
      });

      // Assert
      expect(result.cookie).toBe('a=1; fe_refresh_clientid=fresh');
    });
  });

  it('forwards the requested application id header when present', () => {
    const result = buildRequestHeaders({ [FRONTEGG_APPLICATION_ID_HEADER]: 'app-123' });

    expect(result[FRONTEGG_APPLICATION_ID_HEADER]).toBe('app-123');
  });

  it('forwards the custom login alias header when present', () => {
    const result = buildRequestHeaders({ [CUSTOM_LOGIN_HEADER]: 'tenant-alias' });

    expect(result[CUSTOM_LOGIN_HEADER]).toBe('tenant-alias');
  });

  describe('client ip forwarding', () => {
    it('does not forward the client ip when shouldForwardIp is disabled', () => {
      const result = buildRequestHeaders({ 'x-forwarded-for': '1.1.1.1' });

      expect(result).not.toHaveProperty(FRONTEGG_FORWARD_IP_HEADER);
      expect(result).not.toHaveProperty(FRONTEGG_HEADERS_VERIFIER_HEADER);
      expect(result).not.toHaveProperty(FRONTEGG_VENDOR_ID_HEADER);
    });

    it('forwards the first x-forwarded-for ip with verifier and vendor headers when enabled', () => {
      // Arrange
      Object.assign(mockConfig, { shouldForwardIp: true });

      // Act
      const result = buildRequestHeaders({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2' });

      // Assert
      expect(result[FRONTEGG_FORWARD_IP_HEADER]).toBe('1.1.1.1');
      expect(result[FRONTEGG_HEADERS_VERIFIER_HEADER]).toBe('shared-secret');
      expect(result[FRONTEGG_VENDOR_ID_HEADER]).toBe('client-id');
    });

    it('prefers the frontegg forwarded header over cf-connecting-ip and x-forwarded-for', () => {
      Object.assign(mockConfig, { shouldForwardIp: true });

      const result = buildRequestHeaders({
        [FRONTEGG_FORWARD_IP_HEADER]: '9.9.9.9',
        'cf-connecting-ip': '8.8.8.8',
        'x-forwarded-for': '7.7.7.7',
      });

      expect(result[FRONTEGG_FORWARD_IP_HEADER]).toBe('9.9.9.9');
    });

    it('prefers cf-connecting-ip over x-forwarded-for', () => {
      Object.assign(mockConfig, { shouldForwardIp: true });

      const result = buildRequestHeaders({ 'cf-connecting-ip': '8.8.8.8', 'x-forwarded-for': '7.7.7.7' });

      expect(result[FRONTEGG_FORWARD_IP_HEADER]).toBe('8.8.8.8');
    });

    it('sends an empty verifier header when no shared secret is configured', () => {
      Object.assign(mockConfig, { shouldForwardIp: true, sharedSecret: undefined });

      const result = buildRequestHeaders({ 'x-forwarded-for': '1.1.1.1' });

      expect(result[FRONTEGG_HEADERS_VERIFIER_HEADER]).toBe('');
    });

    it('does not add ip headers when enabled but no ip is available', () => {
      Object.assign(mockConfig, { shouldForwardIp: true });

      const result = buildRequestHeaders({});

      expect(result).not.toHaveProperty(FRONTEGG_FORWARD_IP_HEADER);
    });
  });

  it('drops incoming headers that contain invalid characters', () => {
    const result = buildRequestHeaders({ 'user-agent': 'bad\nagent' });

    expect(result).not.toHaveProperty('user-agent');
  });
});

describe('parseHttpResponse', () => {
  it('returns the parsed json body when the response is ok', async () => {
    const res = new Response(JSON.stringify({ hello: 'world' }), { status: 200 });

    const result = await parseHttpResponse(res);

    expect(result).toEqual({ hello: 'world' });
  });

  it('returns undefined without reading the body when the response is not ok', async () => {
    const res = new Response('not json', { status: 401 });

    const result = await parseHttpResponse(res);

    expect(result).toBeUndefined();
    expect(res.bodyUsed).toBe(false);
  });
});

describe('isMiddlewarePath', () => {
  it.each([
    ['/logout', 'exact string route'],
    ['/account/logout', 'logout suffix regex'],
    ['/identity/resources/auth/v1/user', 'login route'],
    ['/identity/resources/auth/v2/user/token/refresh', 'refresh route'],
    ['/identity/resources/auth/v1/user/saml/postlogin', 'sso postlogin route'],
    ['/oauth/token', 'oauth token route'],
    ['/identity/resources/users/v1/activate', 'activate route'],
  ])('returns true for frontegg auth route %s (%s)', (path) => {
    expect(isMiddlewarePath(path)).toBe(true);
  });

  it.each(['/some/custom/postlogin', '/identity/resources/auth/v1/user/sso/prelogin', '/x/prelogin'])(
    'returns true for non-social path ending with postlogin/prelogin: %s',
    (path) => {
      expect(isMiddlewarePath(path)).toBe(true);
    }
  );

  it('returns false for social login prelogin paths', () => {
    expect(isMiddlewarePath('/identity/resources/auth/v1/user/sso/default/google/prelogin')).toBe(false);
  });

  it.each(['/identity/resources/users/v2/me', '/random', '/logout/extra', ''])(
    'returns false for non-auth path "%s"',
    (path) => {
      expect(isMiddlewarePath(path)).toBe(false);
    }
  );

  it('returns consistent results on repeated calls (global regex state is not shared)', () => {
    const path = '/identity/resources/auth/v1/user';

    const results = [isMiddlewarePath(path), isMiddlewarePath(path), isMiddlewarePath(path)];

    expect(results).toEqual([true, true, true]);
  });
});

describe('getClientIp', () => {
  it.each([undefined, null, ''])('returns undefined for empty input %p', (input) => {
    expect(getClientIp(input as any)).toBeUndefined();
  });

  it('returns a single ip as-is', () => {
    expect(getClientIp('10.0.0.1')).toBe('10.0.0.1');
  });

  it('returns the first trimmed ip from a comma separated list', () => {
    expect(getClientIp(' 10.0.0.1 , 10.0.0.2')).toBe('10.0.0.1');
  });

  it('returns the first ip of the first array element', () => {
    expect(getClientIp(['10.0.0.1, 10.0.0.3', '10.0.0.2'])).toBe('10.0.0.1');
  });
});
