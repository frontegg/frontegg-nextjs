import { cookies } from 'next/headers';
import type { FronteggUserSession, FronteggUserTokens } from '../common';
import { getTokensFromCookie, createGetSession } from '../common';
import CookieManager from '../utils/cookies';

const getCookie = () => {
  const allCookies = cookies().getAll();
  const cookie = CookieManager.parseCookieFromArray(allCookies);
  return cookie;
};

export const getSession = () => createGetSession({ getCookie, cookieResolver: getTokensFromCookie });

export async function getUserSession(): Promise<FronteggUserSession | undefined> {
  const session = await getSession();
  return session?.user;
}

export async function getUserTokens(): Promise<FronteggUserTokens | undefined> {
  try {
    const cookie = getCookie();
    return getTokensFromCookie(cookie);
  } catch (e) {
    console.error(e);
    return undefined;
  }
}
