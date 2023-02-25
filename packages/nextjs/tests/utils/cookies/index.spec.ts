import { test, expect } from '@playwright/test';
import config from '../../../src/config';
import { LARGE_COOKIE_VALUE, SMALL_COOKIE_VALUE, commonTestsForCookie, extractValueOutOfCookie } from './utils';
import CookieManager from '../../../src/utils/cookies';
import { getIndexedCookieName } from '../../../src/utils/cookies/helpers';
import { COOKIE_MAX_LENGTH } from '../../../src/utils/cookies/constants';

const COOKIE_NAME = config.cookieName;
const COOKIE_DOMAIN = config.cookieDomain;

test.describe('CookieManager tests', () => {
  test('should create a fe_session cookie', async () => {
    const expires = new Date(2023, 1, 9);
    const createdCookies: string[] = CookieManager.create({
      value: SMALL_COOKIE_VALUE,
      secure: true,
      expires,
      domain: config.cookieDomain,
    });

    expect(createdCookies.length).toEqual(1);
    commonTestsForCookie({
      cookie: createdCookies[0],
      cookieName: COOKIE_NAME,
      cookieValue: SMALL_COOKIE_VALUE,
      expires,
    });
  });

  test('should split large cookies', () => {
    const expires = new Date(2023, 1, 9);
    const cookies = CookieManager.create({
      cookieName: COOKIE_NAME,
      value: LARGE_COOKIE_VALUE,
      expires,
      secure: true,
      domain: COOKIE_DOMAIN,
    });

    let calculatedValue = '';
    expect(cookies.length).toBeGreaterThan(1);
    cookies.forEach((cookie, index) => {
      const cookieName = getIndexedCookieName(index + 1, COOKIE_NAME);
      const cookieValue = extractValueOutOfCookie(cookie);
      commonTestsForCookie({ cookie, cookieName, cookieValue, expires });
      expect(cookie.length).toBeLessThanOrEqual(COOKIE_MAX_LENGTH);
      calculatedValue += cookieValue;
    });
    expect(calculatedValue).toEqual(LARGE_COOKIE_VALUE);
  });

  test('should create cookies with empty value and expiration date equals to now', () => {
    const firstCookieName = CookieManager.getCookieName(1, COOKIE_NAME);
    const secondCookieName = CookieManager.getCookieName(2, COOKIE_NAME);
    const cookiesToRemove = [COOKIE_NAME, firstCookieName, secondCookieName];
    const isSecured = true;
    const emptyCookies = CookieManager.createEmptyCookies(isSecured, COOKIE_DOMAIN, cookiesToRemove);
    const expires = new Date();

    const refreshTokenCookieNamesLength = 3;
    expect(emptyCookies.length).toEqual(cookiesToRemove.length + refreshTokenCookieNamesLength);
    cookiesToRemove.forEach((cookieName, index) => {
      commonTestsForCookie({ cookie: emptyCookies[index], cookieName, cookieValue: '', expires });
    });
  });
});
