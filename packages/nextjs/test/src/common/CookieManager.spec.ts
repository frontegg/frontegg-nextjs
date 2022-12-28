import { CookieManager, FronteggConfig } from '../../../src';
import { COOKIE_MAX_LENGTH } from '../../../src/common/consts';
import { SMALL_COOKIE_VALUE, LARGE_COOKIE_VALUE, COOKIE_DOMAIN, COOKIE_NAME } from './const';

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
    const cookieValue = CookieManager.createCookie({
      cookieName: COOKIE_NAME,
      value: SMALL_COOKIE_VALUE,
      expires: new Date(),
      isSecured: true,
      cookieDomain: COOKIE_DOMAIN,
    });

    expect(cookieValue.length).toEqual(1);
    expect(cookieValue[0]).toContain(`${COOKIE_NAME}=${SMALL_COOKIE_VALUE}`);
    expect(cookieValue[0]).toContain('HttpOnly');
    expect(cookieValue[0]).toContain('Secure');
    expect(cookieValue[0]).toContain('SameSite=None');
    expect(cookieValue[0]).toContain(`Domain=${COOKIE_DOMAIN}`);
  });

  it('createCookie with big value should create split cookie properly', () => {
    const cookieValue = CookieManager.createCookie({
      cookieName: COOKIE_NAME,
      value: LARGE_COOKIE_VALUE,
      expires: new Date(),
      isSecured: true,
      cookieDomain: COOKIE_DOMAIN,
    });
    const firstCookieName = CookieManager.getCookieName(1, COOKIE_NAME);
    const secondCookieName = CookieManager.getCookieName(2, COOKIE_NAME);

    const firstCookieValue = extractValueOutOfCookie(cookieValue[0]);
    const secondCookieValue = extractValueOutOfCookie(cookieValue[1]);

    expect(cookieValue.length).toEqual(2);

    expect(cookieValue[0]).toContain(`${firstCookieName}=${firstCookieValue}`);
    expect(cookieValue[0]).toContain('HttpOnly');
    expect(cookieValue[0]).toContain('Secure');
    expect(cookieValue[0]).toContain('SameSite=None');
    expect(cookieValue[0]).toContain(`Domain=${COOKIE_DOMAIN}`);
    expect(cookieValue[0].length).toEqual(COOKIE_MAX_LENGTH);

    expect(cookieValue[1]).toContain(`${secondCookieName}=${secondCookieValue}`);
    expect(cookieValue[1]).toContain('HttpOnly');
    expect(cookieValue[1]).toContain('Secure');
    expect(cookieValue[1]).toContain('SameSite=None');
    expect(cookieValue[1]).toContain(`Domain=${COOKIE_DOMAIN}`);
    expect(cookieValue[1].length).toBeLessThan(COOKIE_MAX_LENGTH);

    expect(firstCookieValue + secondCookieValue).toEqual(LARGE_COOKIE_VALUE);
  });

  it('createEmptyCookies should accepts cookie names and create cookies with empty value and expiration date equals to now', () => {
    const firstCookieName = CookieManager.getCookieName(1, COOKIE_NAME);
    const secondCookieName = CookieManager.getCookieName(2, COOKIE_NAME);
    const cookiesToRemove = [COOKIE_NAME, firstCookieName, secondCookieName];
    const isSecured = true;
    const emptyCookies = CookieManager.createEmptyCookies(isSecured, COOKIE_DOMAIN, cookiesToRemove);

    expect(emptyCookies.length).toEqual(cookiesToRemove.length);
    cookiesToRemove.forEach((name, index) => {
      expect(emptyCookies[index]).toContain(`${name}=;`);
      expect(emptyCookies[index]).toContain('HttpOnly');
      expect(emptyCookies[index]).toContain('Secure');
      expect(emptyCookies[index]).toContain('SameSite=None');
      expect(emptyCookies[index]).toContain(`Domain=${COOKIE_DOMAIN}`);
      expect(emptyCookies[index]).toContain(`Expires=${new Date().toUTCString()}`);
    });
  });
});
