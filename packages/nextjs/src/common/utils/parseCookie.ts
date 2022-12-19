import cookie from 'cookie';
import fronteggConfig from '../FronteggConfig';

export function parseCookie(cookieStr: string) {
  let sealFromCookies = '';
  if (cookie.parse(cookieStr)[fronteggConfig.cookieName]) {
    sealFromCookies = cookie.parse(cookieStr)[fronteggConfig.cookieName];
  } else {
    let i = 1;
    while (cookie.parse(cookieStr)[`${fronteggConfig.cookieName}-${i}`]) {
      sealFromCookies += cookie.parse(cookieStr)[`${fronteggConfig.cookieName}-${i}`];
      i++;
    }
  }
  return sealFromCookies !== '' ? sealFromCookies : undefined;
}
