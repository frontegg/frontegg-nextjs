import {
  FronteggNextJSSession,
  FronteggUserSession,
  FronteggUserTokens,
  parseCookieFromArray,
  getSessionFromCookie,
  getTokensFromCookie,
} from '../common';
import { cookies } from 'next/headers';

const getCookie = () => {
  const allCookies = cookies().getAll();
  const cookie = parseCookieFromArray(allCookies);
  return cookie;
};

export async function getSession(): Promise<FronteggNextJSSession | undefined> {
  try {
    const cookie = getCookie();
    return getSessionFromCookie(cookie);
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

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
