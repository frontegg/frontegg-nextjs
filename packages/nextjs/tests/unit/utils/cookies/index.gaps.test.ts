import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IncomingMessage } from 'http';
import { mockConfig, mockFetchRequest, mockIncomingMessage, mockServerResponse } from './fixtures';

const { configState } = vi.hoisted(() => ({ configState: {} as Record<string, unknown> }));

vi.mock('../../../../src/config', () => ({ default: configState }));

import CookieManager from '../../../../src/utils/cookies';

const COOKIE_NAME = 'fe_session';
const COOKIE_DOMAIN = 'example.com';
const EXPIRES = new Date('2030-02-09T00:00:00Z');

/** Cookie names (the part before `=`) of a list of Set-Cookie headers. */
const namesOf = (cookies: string[]) => cookies.map((cookie) => cookie.split('=')[0]);

beforeEach(() => {
  Object.keys(configState).forEach((key) => delete configState[key]);
  Object.assign(configState, mockConfig());
});

describe('CookieManager.getCookieName', () => {
  it('returns the configured cookie name without an index', () => {
    expect(CookieManager.getCookieName()).toBe(COOKIE_NAME);
  });

  it('returns an indexed cookie name for chunk numbers', () => {
    expect(CookieManager.getCookieName(3)).toBe(`${COOKIE_NAME}-3`);
  });

  it('supports a custom base cookie name', () => {
    expect(CookieManager.getCookieName(2, 'custom')).toBe('custom-2');
  });
});

describe('CookieManager.refreshTokenKey', () => {
  it('is derived from the clientId without dashes by default', () => {
    expect(CookieManager.refreshTokenKey).toBe('fe_refresh_abcdefghi');
  });

  it('is derived from the appId without dashes when rewriteCookieByAppId is enabled', () => {
    Object.assign(configState, { rewriteCookieByAppId: true, appId: 'app-id-42' });

    expect(CookieManager.refreshTokenKey).toBe('fe_refresh_appid42');
  });

  it('falls back to the clientId when rewriteCookieByAppId is enabled but appId is missing', () => {
    Object.assign(configState, { rewriteCookieByAppId: true, appId: undefined });

    expect(CookieManager.refreshTokenKey).toBe('fe_refresh_abcdefghi');
  });
});

describe('CookieManager.parseCookieHeader', () => {
  it('parses all cookies from an IncomingMessage', () => {
    const req = mockIncomingMessage({ a: '1', b: 'two' });

    expect(CookieManager.parseCookieHeader(req)).toEqual({ a: '1', b: 'two' });
  });

  it('parses all cookies from a Fetch Request', () => {
    const req = mockFetchRequest({ a: '1', encoded: 'x%20y' });

    expect(CookieManager.parseCookieHeader(req)).toEqual({ a: '1', encoded: 'x y' });
  });

  it('returns an empty map when the request has no cookie header', () => {
    expect(CookieManager.parseCookieHeader(mockIncomingMessage(''))).toEqual({});
  });
});

describe('CookieManager.getRefreshCookieFromRequestEdge', () => {
  it('returns undefined when no request is given', () => {
    expect(CookieManager.getRefreshCookieFromRequestEdge(undefined)).toBeUndefined();
  });

  it('returns undefined when the refresh cookie is absent', () => {
    const req = mockFetchRequest({ [COOKIE_NAME]: 'session', other: 'x' });

    expect(CookieManager.getRefreshCookieFromRequestEdge(req)).toBeUndefined();
  });

  it.each(['fe_refresh_abcdefghi', 'fe_refresh_abc-def-ghi', 'fe_refresh_abcdef-ghi'])(
    'finds the refresh cookie named %s regardless of dashes',
    (cookieName) => {
      const req = mockFetchRequest({ other: 'x', [cookieName]: 'refresh-token' });

      expect(CookieManager.getRefreshCookieFromRequestEdge(req)).toBe('refresh-token');
    }
  );

  it('looks up the appId based refresh cookie when rewriteCookieByAppId is enabled', () => {
    Object.assign(configState, { rewriteCookieByAppId: true, appId: 'app-id-42' });
    const req = mockIncomingMessage({ fe_refresh_abcdefghi: 'client-token', 'fe_refresh_app-id-42': 'app-token' });

    // + Assert
    expect(CookieManager.getRefreshCookieFromRequestEdge(req)).toBe('app-token');
  });
});

describe('CookieManager.parseCookieFromArray', () => {
  it('returns undefined when no session cookies are present', () => {
    expect(CookieManager.parseCookieFromArray([{ name: 'other', value: 'x' }])).toBeUndefined();
  });

  it('returns undefined for an empty cookie list', () => {
    expect(CookieManager.parseCookieFromArray([])).toBeUndefined();
  });

  it('returns the value of a single unchunked session cookie', () => {
    const cookies = [
      { name: 'other', value: 'x' },
      { name: COOKIE_NAME, value: 'whole-session' },
    ];

    expect(CookieManager.parseCookieFromArray(cookies)).toBe('whole-session');
  });

  it('concatenates chunked session cookies in index order regardless of input order', () => {
    const cookies = [
      { name: `${COOKIE_NAME}-3`, value: 'CCC' },
      { name: 'unrelated', value: 'zzz' },
      { name: `${COOKIE_NAME}-1`, value: 'AAA' },
      { name: `${COOKIE_NAME}-2`, value: 'BBB' },
    ];

    const session = CookieManager.parseCookieFromArray(cookies);

    expect(session).toBe('AAABBBCCC');
  });

  /** Known bug (src/utils/cookies/index.ts:240): chunks sort by the last digit, so 10+ chunks reassemble out of order. */
  it.fails('concatenates 10 or more chunks in numeric order', () => {
    const cookies = Array.from({ length: 11 }, (_, i) => ({
      name: `${COOKIE_NAME}-${i + 1}`,
      value: String.fromCharCode(65 + i),
    }));

    const session = CookieManager.parseCookieFromArray(cookies);

    expect(session).toBe('ABCDEFGHIJK');
  });
});

describe('CookieManager.create - removal of stale cookies', () => {
  it('does not emit a removal cookie when the request only has the cookie being replaced', () => {
    const req = mockIncomingMessage({ [COOKIE_NAME]: 'old-session' });

    const cookies = CookieManager.create({ req, value: 'new', secure: true, expires: EXPIRES });

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toContain(`${COOKIE_NAME}=new`);
  });

  it('expires stale chunk cookies using config.cookieDomain when no domain is given', () => {
    const req = mockIncomingMessage({ [`${COOKIE_NAME}-1`]: 'old-a', [`${COOKIE_NAME}-2`]: 'old-b' });

    const cookies = CookieManager.create({ req, value: 'new', secure: false, expires: EXPIRES });

    expect(namesOf(cookies)).toEqual([`${COOKIE_NAME}-1`, `${COOKIE_NAME}-2`, COOKIE_NAME]);
    const [firstRemoval, secondRemoval] = cookies;
    expect(firstRemoval).toMatch(new RegExp(`^${COOKIE_NAME}-1=;`));
    expect(firstRemoval).toContain(`Domain=${COOKIE_DOMAIN}`);
    expect(secondRemoval).toContain(`Domain=${COOKIE_DOMAIN}`);
  });

  it('does not look for stale cookies when the new value is empty', () => {
    const req = mockIncomingMessage({ [`${COOKIE_NAME}-1`]: 'old-a' });

    const cookies = CookieManager.create({ req, value: '', secure: true, expires: EXPIRES });

    expect(namesOf(cookies)).toEqual([COOKIE_NAME]);
  });

  it('respects explicit httpOnly=false and a custom path', () => {
    const cookies = CookieManager.create({
      value: 'v',
      secure: false,
      expires: EXPIRES,
      httpOnly: false,
      path: '/sub',
    });

    expect(cookies[0]).not.toContain('HttpOnly');
    expect(cookies[0]).toContain('Path=/sub');
  });

  it('uses config.cookieSameSite for secure cookies', () => {
    configState.cookieSameSite = 'lax';

    const cookies = CookieManager.create({ value: 'v', secure: true, expires: EXPIRES });

    expect(cookies[0]).toContain('SameSite=Lax');
  });
});

describe('CookieManager.createEmptyCookies', () => {
  it('expires the given cookies plus every refresh-token name variant by default', () => {
    const cookies = CookieManager.createEmptyCookies(true, COOKIE_DOMAIN, ['a', 'b']);

    expect(namesOf(cookies)).toEqual([
      'a',
      'b',
      'fe_refresh_abc-def-ghi',
      'fe_refresh_abcdef-ghi',
      'fe_refresh_abcdefghi',
    ]);
    cookies.forEach((cookie) => {
      expect(cookie).toMatch(/^[^=]+=;/);
      expect(cookie).toContain(`Domain=${COOKIE_DOMAIN}`);
      expect(cookie).toContain('Secure');
    });
  });

  it('does not expire refresh-token cookies when removeRefresh is false', () => {
    const cookies = CookieManager.createEmptyCookies(false, COOKIE_DOMAIN, ['a'], false);

    expect(namesOf(cookies)).toEqual(['a']);
    expect(cookies[0]).not.toContain('Secure');
  });

  it('uses appId based refresh-token variants when rewriteCookieByAppId is enabled', () => {
    Object.assign(configState, { rewriteCookieByAppId: true, appId: 'app-id-42' });

    const cookies = CookieManager.createEmptyCookies(true, COOKIE_DOMAIN, []);

    expect(namesOf(cookies)).toEqual(['fe_refresh_app-id-42', 'fe_refresh_appid-42', 'fe_refresh_appid42']);
  });
});

describe('CookieManager.getRequestCookiesHeaderToRemove', () => {
  it('returns only refresh-token removals when the request has no cookie header', () => {
    const cookies = CookieManager.getRequestCookiesHeaderToRemove({
      isSecured: true,
      cookieDomain: COOKIE_DOMAIN,
      req: mockIncomingMessage(''),
    });

    expect(namesOf(cookies)).toEqual(['fe_refresh_abc-def-ghi', 'fe_refresh_abcdef-ghi', 'fe_refresh_abcdefghi']);
  });

  it('returns only refresh-token removals when no request is given', () => {
    const cookies = CookieManager.getRequestCookiesHeaderToRemove({ isSecured: true, cookieDomain: COOKIE_DOMAIN });

    expect(namesOf(cookies)).toEqual(['fe_refresh_abc-def-ghi', 'fe_refresh_abcdef-ghi', 'fe_refresh_abcdefghi']);
  });

  it('removes the unchunked and every chunked session cookie found in the request', () => {
    const req = mockFetchRequest({
      [COOKIE_NAME]: 'x',
      [`${COOKIE_NAME}-1`]: 'a',
      [`${COOKIE_NAME}-2`]: 'b',
      other: 'keep',
    });

    const cookies = CookieManager.getRequestCookiesHeaderToRemove({
      isSecured: false,
      cookieDomain: COOKIE_DOMAIN,
      req,
    });

    expect(namesOf(cookies).slice(0, 3)).toEqual([COOKIE_NAME, `${COOKIE_NAME}-1`, `${COOKIE_NAME}-2`]);
    expect(namesOf(cookies)).not.toContain('other');
  });

  it('swallows errors while reading the request and only removes refresh-token cookies', () => {
    // a request whose headers cannot be read
    const req = {
      get headers(): never {
        throw new Error('headers unavailable');
      },
    } as unknown as IncomingMessage;

    const cookies = CookieManager.getRequestCookiesHeaderToRemove({
      isSecured: true,
      cookieDomain: COOKIE_DOMAIN,
      req,
    });

    expect(namesOf(cookies)).toEqual(['fe_refresh_abc-def-ghi', 'fe_refresh_abcdef-ghi', 'fe_refresh_abcdefghi']);
  });
});

describe('CookieManager.removeCookies - existing header shapes', () => {
  it('flattens an object-shaped existing set-cookie header before appending', () => {
    const res = mockServerResponse();
    res.getHeader.mockReturnValue({ 0: 'first=1', 1: 'second=2' });

    CookieManager.removeCookies({ cookieNames: ['gone'], isSecured: true, cookieDomain: COOKIE_DOMAIN, res });

    const [, headers] = res.setHeader.mock.calls[0];
    expect(headers.slice(0, 2)).toEqual(['first=1', 'second=2']);
    expect(namesOf(headers.slice(2))).toEqual([
      'gone',
      'fe_refresh_abc-def-ghi',
      'fe_refresh_abcdef-ghi',
      'fe_refresh_abcdefghi',
    ]);
  });

  it('starts from an empty list when there is no existing set-cookie header', () => {
    const res = mockServerResponse();

    CookieManager.removeCookies({ cookieNames: [], isSecured: true, cookieDomain: COOKIE_DOMAIN, res });

    const [name, headers] = res.setHeader.mock.calls[0];
    expect(name).toBe('set-cookie');
    expect(namesOf(headers)).toHaveLength(3);
  });
});

describe('CookieManager.modifySetCookie - name and domain rewriting', () => {
  it('rewrites a Domain pointing at the Frontegg base url host to the app cookie domain', () => {
    const result = CookieManager.modifySetCookie(['a=1; Domain=frontegg.example.com; Path=/'], true);

    expect(result).toEqual([`a=1;Domain=${COOKIE_DOMAIN};Path=/;`]);
  });

  it('matches the Frontegg Domain case-insensitively', () => {
    const result = CookieManager.modifySetCookie(['a=1; domain=FRONTEGG.EXAMPLE.COM'], true);

    expect(result).toEqual([`a=1;Domain=${COOKIE_DOMAIN};`]);
  });

  it('keeps unrelated Domain attributes untouched', () => {
    const result = CookieManager.modifySetCookie(['a=1; Domain=other.com'], true);

    expect(result).toEqual(['a=1;Domain=other.com;']);
  });

  it('keeps the clientId based refresh cookie name when rewriteCookieByAppId is disabled', () => {
    const result = CookieManager.modifySetCookie(['fe_refresh_abcdef-ghi=token; Path=/'], true);

    expect(result).toEqual(['fe_refresh_abcdef-ghi=token;Path=/;']);
  });

  it('renames the refresh cookie to the appId based name when rewriteCookieByAppId is enabled', () => {
    Object.assign(configState, { rewriteCookieByAppId: true, appId: 'app-id' });

    const result = CookieManager.modifySetCookie(['fe_refresh_abcdef-ghi=token; Path=/'], true);

    expect(result).toEqual(['fe_refresh_appid=token;Path=/;']);
  });

  it('keeps the refresh cookie name when rewriteCookieByAppId is enabled but appId is missing', () => {
    Object.assign(configState, { rewriteCookieByAppId: true, appId: undefined });

    const result = CookieManager.modifySetCookie(['fe_refresh_abcdef-ghi=token'], true);

    expect(result).toEqual(['fe_refresh_abcdef-ghi=token;']);
  });
});
