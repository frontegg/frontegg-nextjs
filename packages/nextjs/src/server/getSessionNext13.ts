import { cookies } from 'next/headers';
import { FronteggUserSession, FronteggUserTokens, getTokensFromCookie, parseCookieFromArray } from '../common';
import { createGetSession } from '../common/utils/createGetSession';

const getCookie = () => {
  const allCookies = cookies().getAll();
  const cookie = parseCookieFromArray(allCookies);
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
