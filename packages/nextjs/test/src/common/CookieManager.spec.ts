import { CookieManager, FronteggConfig } from '../../../src';
import { smallCookieValue, bigCookieValue, cookieDomain, cookieName } from './const';

const extractValueOutOfCookie = (cookie: string) =>
  cookie
    .split('; ')
    ?.find((c) => c.includes(cookieName))
    ?.split('=')[1] ?? '';

describe('Cookie Manager', () => {
  it('getCookieName should return right cookie name', () => {
    const cookieNumber = 7;
    const cookieName = CookieManager.getCookieName(cookieNumber);
    expect(cookieName).toEqual(`${FronteggConfig.cookieName}-${cookieNumber}`);
  });

  it('createCookie should create cookie properly', () => {
    const cookieValue = CookieManager.createCookie({
      cookieName,
      value: smallCookieValue,
      expires: new Date(),
      isSecured: true,
      cookieDomain,
    });

    expect(cookieValue.length).toEqual(1);
    expect(cookieValue[0]).toContain(`${cookieName}=${smallCookieValue}`);
    expect(cookieValue[0]).toContain('HttpOnly');
    expect(cookieValue[0]).toContain('Secure');
    expect(cookieValue[0]).toContain('SameSite=None');
    expect(cookieValue[0]).toContain(`Domain=${cookieDomain}`);
  });

  it('createCookie with big value should create split cookie properly', () => {
    const cookieValue = CookieManager.createCookie({
      cookieName,
      value: bigCookieValue,
      expires: new Date(),
      isSecured: true,
      cookieDomain,
    });
    const firstCookieName = CookieManager.getCookieName(1, cookieName);
    const secondCookieName = CookieManager.getCookieName(2, cookieName);

    const firstCookieValue = extractValueOutOfCookie(cookieValue[0]);
    const secondCookieValue = extractValueOutOfCookie(cookieValue[1]);

    expect(cookieValue.length).toEqual(2);

    expect(cookieValue[0]).toContain(`${firstCookieName}=${firstCookieValue}`);
    expect(cookieValue[0]).toContain('HttpOnly');
    expect(cookieValue[0]).toContain('Secure');
    expect(cookieValue[0]).toContain('SameSite=None');
    expect(cookieValue[0]).toContain(`Domain=${cookieDomain}`);

    expect(cookieValue[1]).toContain(`${secondCookieName}=${secondCookieValue}`);
    expect(cookieValue[1]).toContain('HttpOnly');
    expect(cookieValue[1]).toContain('Secure');
    expect(cookieValue[1]).toContain('SameSite=None');
    expect(cookieValue[1]).toContain(`Domain=${cookieDomain}`);

    expect(firstCookieValue + secondCookieValue).toEqual(bigCookieValue);
  });

  it('createCookie with big value should create split cookie properly', () => {
    const cookieValue = CookieManager.createCookie({
      cookieName,
      value: bigCookieValue,
      expires: new Date(),
      isSecured: true,
      cookieDomain,
    });
    const firstCookieName = CookieManager.getCookieName(1, cookieName);
    const secondCookieName = CookieManager.getCookieName(2, cookieName);

    expect(cookieValue.length).toEqual(2);

    expect(cookieValue[0]).toContain(firstCookieName);
    expect(cookieValue[0]).toContain('HttpOnly');
    expect(cookieValue[0]).toContain('Secure');
    expect(cookieValue[0]).toContain('SameSite=None');
    expect(cookieValue[0]).toContain(`Domain=${cookieDomain}`);

    expect(cookieValue[1]).toContain(secondCookieName);
    expect(cookieValue[1]).toContain('HttpOnly');
    expect(cookieValue[1]).toContain('Secure');
    expect(cookieValue[1]).toContain('SameSite=None');
    expect(cookieValue[1]).toContain(`Domain=${cookieDomain}`);
  });

  it('createEmptyCookies should accepts cookie names and create same cookies with empty value and expiration date equals to now', () => {
    const emptyCookies = CookieManager.createEmptyCookies(true, cookieDomain, [cookieName]);

    expect(emptyCookies.length).toEqual(1);
    expect(emptyCookies[0]).toContain(`${cookieName}=;`);
    expect(emptyCookies[0]).toContain('HttpOnly');
    expect(emptyCookies[0]).toContain('Secure');
    expect(emptyCookies[0]).toContain('SameSite=None');
    expect(emptyCookies[0]).toContain(`Domain=${cookieDomain}`);
    expect(emptyCookies[0]).toContain(`Expires=${new Date().toUTCString()}`);
  });
});
