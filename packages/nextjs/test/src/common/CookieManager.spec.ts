import { CookieManager, FronteggConfig } from '../../../src';
import { COOKIE_MAX_LENGTH } from '../../../src/common/consts';
import { SMALL_COOKIE_VALUE, LARGE_COOKIE_VALUE, COOKIE_DOMAIN, COOKIE_NAME } from './const';

const commonTestsForCookie = ({
  cookie,
  cookieName,
  cookieValue,
  expires,
}: {
  cookie: string;
  cookieName: string;
  cookieValue: string;
  expires: Date;
}) => {
  expect(cookie).toContain(`${cookieName}=${cookieValue};`);
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('Secure');
  expect(cookie).toContain('SameSite=None');
  expect(cookie).toContain(`Domain=${COOKIE_DOMAIN}`);
  expect(cookie).toContain(`Expires=${expires.toUTCString()}`);
};

const extractValueOutOfCookie = (cookie: string) =>
  cookie
    .split('; ')
    ?.find((c) => c.includes(COOKIE_NAME))
    ?.split('=')[1] ?? '';

describe('Cookie Manager', () => {
  it('getCookieName should return right cookie name', () => {
    const cookieNumber = 7;
    const cookieName = CookieManager.getCookieName(cookieNumber);
    expect(cookieName).toEqual(`${FronteggConfig.cookieName}-${cookieNumber}`);
  });

  it('createCookie should create cookie properly', () => {
    const expires = new Date(2023, 1, 9);
    const cookies = CookieManager.createCookie({
      cookieName: COOKIE_NAME,
      value: SMALL_COOKIE_VALUE,
      expires,
      isSecured: true,
      cookieDomain: COOKIE_DOMAIN,
    });

    expect(cookies.length).toEqual(1);
    commonTestsForCookie({ cookie: cookies[0], cookieName: COOKIE_NAME, cookieValue: SMALL_COOKIE_VALUE, expires });
  });

  it('createCookie with big value should create split cookie properly', () => {
    const expires = new Date(2023, 1, 9);
    const cookies = CookieManager.createCookie({
      cookieName: COOKIE_NAME,
      value: LARGE_COOKIE_VALUE,
      expires,
      isSecured: true,
      cookieDomain: COOKIE_DOMAIN,
    });

    let calculatedValue = '';

    expect(cookies.length).toBeGreaterThan(1);
    cookies.forEach((cookie, index) => {
      const cookieName = CookieManager.getCookieName(index + 1, COOKIE_NAME);
      const cookieValue = extractValueOutOfCookie(cookie);
      commonTestsForCookie({ cookie, cookieName, cookieValue, expires });
      expect(cookies[0].length).toBeLessThan(COOKIE_MAX_LENGTH + 1);
      calculatedValue += cookieValue;
    });
    expect(calculatedValue).toEqual(LARGE_COOKIE_VALUE);
  });

  it('createEmptyCookies should accepts cookie names and create cookies with empty value and expiration date equals to now', () => {
    const firstCookieName = CookieManager.getCookieName(1, COOKIE_NAME);
    const secondCookieName = CookieManager.getCookieName(2, COOKIE_NAME);
    const cookiesToRemove = [COOKIE_NAME, firstCookieName, secondCookieName];
    const isSecured = true;
    const emptyCookies = CookieManager.createEmptyCookies(isSecured, COOKIE_DOMAIN, cookiesToRemove);

    const refreshTokenCookieNamesLength = 3;
    expect(emptyCookies.length).toEqual(cookiesToRemove.length + refreshTokenCookieNamesLength);
    cookiesToRemove.forEach((cookieName, index) => {
      commonTestsForCookie({ cookie: emptyCookies[index], cookieName, cookieValue: '', expires: new Date() });
    });
  });
});
