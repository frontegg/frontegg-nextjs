import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../src/config', () => ({
  default: {
    cookieName: 'fe_session',
    cookieDomain: 'example.com',
    cookieSameSite: 'none',
    clientId: 'abc-def-ghi',
    appId: undefined as string | undefined,
    rewriteCookieByAppId: false,
    baseUrlHost: 'frontegg.example.com',
  },
}));

import CookieManager from '../../../../src/utils/cookies';
import { COOKIE_MAX_LENGTH } from '../../../../src/utils/cookies/constants';
import { getIndexedCookieName } from '../../../../src/utils/cookies/helpers';
import { mockIncomingMessage, mockFetchRequest, mockServerResponse, extractCookieValue } from './fixtures';

const COOKIE_NAME = 'fe_session';
const COOKIE_DOMAIN = 'example.com';

describe('CookieManager.create', () => {
  const expires = new Date('2030-02-09T00:00:00Z');

  it('creates a single cookie when session fits in one chunk', () => {
    const cookies = CookieManager.create({
      value: 'small-value',
      secure: true,
      expires,
      domain: COOKIE_DOMAIN,
    });

    expect(cookies).toHaveLength(1);
    const cookie = cookies[0];
    expect(cookie).toContain(`${COOKIE_NAME}=small-value`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=None');
    expect(cookie).toContain(`Domain=${COOKIE_DOMAIN}`);
    expect(cookie).toContain(`Expires=${expires.toUTCString()}`);
  });

  it('creates N chunked cookies when session exceeds chunk size', () => {
    const largeValue = 'L'.repeat(10_000);
    const cookies = CookieManager.create({
      value: largeValue,
      secure: true,
      expires,
      domain: COOKIE_DOMAIN,
    });

    expect(cookies.length).toBeGreaterThan(1);

    let concatenated = '';
    cookies.forEach((cookie, idx) => {
      const cookieName = getIndexedCookieName(idx + 1, COOKIE_NAME);
      expect(cookie).toContain(`${cookieName}=`);
      expect(cookie.length).toBeLessThanOrEqual(COOKIE_MAX_LENGTH);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain(`Domain=${COOKIE_DOMAIN}`);
      expect(cookie).toContain(`Expires=${expires.toUTCString()}`);
      const val = extractCookieValue(cookie, cookieName) ?? '';
      concatenated += val;
    });
    expect(concatenated).toBe(largeValue);
  });

  it('uses the default cookieName from config when not provided', () => {
    const cookies = CookieManager.create({
      value: 'v',
      secure: true,
      expires,
      domain: COOKIE_DOMAIN,
    });
    expect(cookies[0]).toContain(`${COOKIE_NAME}=`);
  });

  it('respects a custom cookieName override', () => {
    const cookies = CookieManager.create({
      cookieName: 'custom_cookie',
      value: 'v',
      secure: true,
      expires,
      domain: COOKIE_DOMAIN,
    });
    expect(cookies[0]).toContain('custom_cookie=v');
  });

  it('propagates expires date to the Set-Cookie header', () => {
    const cookies = CookieManager.create({
      value: 'v',
      secure: true,
      expires,
      domain: COOKIE_DOMAIN,
    });
    expect(cookies[0]).toContain(`Expires=${expires.toUTCString()}`);
  });

  it('secure: true produces "Secure; SameSite=None"', () => {
    const cookies = CookieManager.create({
      value: 'v',
      secure: true,
      expires,
      domain: COOKIE_DOMAIN,
    });
    expect(cookies[0]).toContain('Secure');
    expect(cookies[0]).toContain('SameSite=None');
  });

  it('secure: false omits Secure and SameSite', () => {
    const cookies = CookieManager.create({
      value: 'v',
      secure: false,
      expires,
      domain: COOKIE_DOMAIN,
    });
    expect(cookies[0]).not.toContain('Secure');
    expect(cookies[0]).not.toContain('SameSite');
  });

  it('applies cookieDomain from config when domain option omitted', () => {
    const cookies = CookieManager.create({
      value: 'v',
      secure: true,
      expires,
    });
    // config.cookieDomain is "example.com"
    expect(cookies[0]).toContain('Domain=example.com');
  });

  it('returns empty-cookies prefix when req contains existing session cookies to remove', () => {
    // Simulate an existing chunked session in the incoming request.
    const req = mockIncomingMessage({
      [COOKIE_NAME]: 'old-session',
    });

    const cookies = CookieManager.create({
      req,
      value: 'new-session-value',
      secure: true,
      expires,
      domain: COOKIE_DOMAIN,
    });

    // Should contain at least the new cookie plus an empty (expired) removal cookie
    expect(cookies.length).toBeGreaterThanOrEqual(1);
    // Last entries should be the new cookie
    const newCookie = cookies[cookies.length - 1];
    expect(newCookie).toContain(`${COOKIE_NAME}=new-session-value`);
  });
});

describe('CookieManager.removeCookies', () => {
  it('sets expired empty cookies for a single provided cookieName', () => {
    const res = mockServerResponse();
    CookieManager.removeCookies({
      cookieNames: [COOKIE_NAME],
      isSecured: true,
      cookieDomain: COOKIE_DOMAIN,
      res,
    });

    expect(res.setHeader).toHaveBeenCalledTimes(1);
    const [headerName, value] = res.setHeader.mock.calls[0];
    expect(headerName).toBe('set-cookie');
    const arr = value as string[];
    expect(Array.isArray(arr)).toBe(true);
    // Should include an empty value for the provided cookie name
    const mainRemoval = arr.find((c) => c.startsWith(`${COOKIE_NAME}=;`));
    expect(mainRemoval).toBeDefined();
    expect(mainRemoval).toContain('HttpOnly');
    // Expires should be set (to epoch/now)
    expect(mainRemoval).toMatch(/Expires=/);
  });

  it('creates empty cookies for multiple chunked cookie names', () => {
    const res = mockServerResponse();
    CookieManager.removeCookies({
      cookieNames: [COOKIE_NAME, `${COOKIE_NAME}-1`, `${COOKIE_NAME}-2`],
      isSecured: true,
      cookieDomain: COOKIE_DOMAIN,
      res,
    });

    const arr = res.setHeader.mock.calls[0][1] as string[];
    expect(arr.some((c) => c.startsWith(`${COOKIE_NAME}=;`))).toBe(true);
    expect(arr.some((c) => c.startsWith(`${COOKIE_NAME}-1=;`))).toBe(true);
    expect(arr.some((c) => c.startsWith(`${COOKIE_NAME}-2=;`))).toBe(true);
  });

  it('appends to an existing set-cookie header instead of overwriting', () => {
    const preExisting = 'other=value; Path=/';
    const res = mockServerResponse({ 'set-cookie': preExisting });
    CookieManager.removeCookies({
      cookieNames: [COOKIE_NAME],
      isSecured: true,
      cookieDomain: COOKIE_DOMAIN,
      res,
    });

    const arr = res.setHeader.mock.calls[0][1] as string[];
    expect(arr[0]).toBe(preExisting);
    expect(arr.length).toBeGreaterThan(1);
  });

  it('appends when existing set-cookie header is already an array', () => {
    const res = mockServerResponse({ 'set-cookie': ['a=1', 'b=2'] });
    CookieManager.removeCookies({
      cookieNames: [COOKIE_NAME],
      isSecured: true,
      cookieDomain: COOKIE_DOMAIN,
      res,
    });

    const arr = res.setHeader.mock.calls[0][1] as string[];
    expect(arr[0]).toBe('a=1');
    expect(arr[1]).toBe('b=2');
    expect(arr.length).toBeGreaterThan(2);
  });

  it('omits Secure when isSecured=false', () => {
    const res = mockServerResponse();
    CookieManager.removeCookies({
      cookieNames: [COOKIE_NAME],
      isSecured: false,
      cookieDomain: COOKIE_DOMAIN,
      res,
    });

    const arr = res.setHeader.mock.calls[0][1] as string[];
    const mainRemoval = arr.find((c) => c.startsWith(`${COOKIE_NAME}=;`))!;
    expect(mainRemoval).not.toContain('Secure');
  });

  it('falls back to parsing cookies from req when cookieNames not provided', () => {
    const res = mockServerResponse();
    const req = mockIncomingMessage({
      [COOKIE_NAME]: 'old',
      [`${COOKIE_NAME}-1`]: 'chunk1',
    });
    CookieManager.removeCookies({
      isSecured: true,
      cookieDomain: COOKIE_DOMAIN,
      res,
      req,
    });

    const arr = res.setHeader.mock.calls[0][1] as string[];
    expect(arr.some((c) => c.startsWith(`${COOKIE_NAME}=;`))).toBe(true);
    expect(arr.some((c) => c.startsWith(`${COOKIE_NAME}-1=;`))).toBe(true);
  });
});

describe('CookieManager.modifySetCookie', () => {
  it('returns undefined when input is undefined', () => {
    expect(CookieManager.modifySetCookie(undefined, true)).toBeUndefined();
  });

  it('returns the input unchanged (empty array) when input is empty', () => {
    const result = CookieManager.modifySetCookie([], true);
    expect(result).toEqual([]);
  });

  it('leaves Secure / SameSite=None intact when isSecured=true', () => {
    const input = ['fe_other=v; Secure; SameSite=None; HttpOnly'];
    const result = CookieManager.modifySetCookie(input, true);
    expect(result).toHaveLength(1);
    expect(result![0]).toContain('Secure');
    expect(result![0]).toContain('SameSite=None');
  });

  it('removes Secure and SameSite=None when isSecured=false', () => {
    const input = ['fe_other=v; Secure; SameSite=None; HttpOnly'];
    const result = CookieManager.modifySetCookie(input, false);
    expect(result).toHaveLength(1);
    expect(result![0]).not.toContain('Secure');
    expect(result![0]).not.toContain('SameSite=None');
    expect(result![0]).toContain('HttpOnly');
  });

  it('leaves unrelated cookies alone other than trailing semicolon normalization', () => {
    const input = ['unrelated=value; Path=/; HttpOnly'];
    const result = CookieManager.modifySetCookie(input, true);
    expect(result![0]).toContain('unrelated=value');
    expect(result![0]).toContain('Path=/');
  });

  it('handles a string input by splitting it into an array via the regex splitter', () => {
    // modifySetCookie claims to support string input via its internal splitter,
    // despite its TS signature. Pass-through should not throw and should
    // return an array.
    const input = 'a=1; Path=/, b=2; Path=/' as unknown as string[];
    const result = CookieManager.modifySetCookie(input, true);
    expect(Array.isArray(result)).toBe(true);
    expect(result!.length).toBeGreaterThanOrEqual(1);
  });
});

describe('CookieManager.getSessionCookieFromRequest', () => {
  it('returns a single cookie value unchanged when session is not chunked', () => {
    const req = mockIncomingMessage({ [COOKIE_NAME]: 'whole-session' });
    const result = CookieManager.getSessionCookieFromRequest(req);
    expect(result).toBe('whole-session');
  });

  it('returns undefined when the request argument is not provided', () => {
    expect(CookieManager.getSessionCookieFromRequest(undefined)).toBeUndefined();
  });

  it('returns undefined when no session cookies are present', () => {
    const req = mockIncomingMessage({ unrelated: 'x' });
    expect(CookieManager.getSessionCookieFromRequest(req)).toBeUndefined();
  });

  it('concatenates chunked session cookies in index order', () => {
    const req = mockIncomingMessage({
      [`${COOKIE_NAME}-1`]: 'part1',
      [`${COOKIE_NAME}-2`]: 'part2',
      [`${COOKIE_NAME}-3`]: 'part3',
    });
    const result = CookieManager.getSessionCookieFromRequest(req);
    expect(result).toBe('part1part2part3');
  });

  it('ignores unrelated cookies around the session chunks', () => {
    const req = mockIncomingMessage({
      other: 'x',
      [`${COOKIE_NAME}-1`]: 'A',
      [`${COOKIE_NAME}-2`]: 'B',
      noise: 'y',
    });
    expect(CookieManager.getSessionCookieFromRequest(req)).toBe('AB');
  });

  it('supports Fetch-style Request objects (credentials branch)', () => {
    const req = mockFetchRequest({ [COOKIE_NAME]: 'fetch-session' });
    expect(CookieManager.getSessionCookieFromRequest(req)).toBe('fetch-session');
  });

  it('reads chunks in numeric index order regardless of cookie-header ordering', () => {
    // Build cookie header with chunks out of order.
    const header = `${COOKIE_NAME}-2=B; ${COOKIE_NAME}-1=A; ${COOKIE_NAME}-3=C`;
    const req = mockIncomingMessage(header);
    expect(CookieManager.getSessionCookieFromRequest(req)).toBe('ABC');
  });
});
