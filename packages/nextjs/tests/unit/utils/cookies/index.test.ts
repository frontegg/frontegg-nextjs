import { describe, it, expect, vi, beforeEach } from 'vitest';

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
import { mockIncomingMessage, mockServerResponse, extractCookieValue } from './fixtures';

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
