import { cookies } from 'next/headers';
import type { FronteggUserSession, FronteggUserTokens } from '../types';
import { getTokensFromCookie } from '../common';
import CookieManager from '../utils/cookies';
import createSession from '../utils/createSession';
import encryption from '../utils/encryption';

const getCookie = () => {
  const allCookies = cookies().getAll();
  return CookieManager.parseCookieFromArray(allCookies);
};

const getSession = () => {
  const cookies = getCookie();
  return createSession(cookies, encryption);
};

async function getUserSession(): Promise<FronteggUserSession | undefined> {
  const session = await getSession();
  return session?.user;
}

async function getUserTokens(): Promise<FronteggUserTokens | undefined> {
  try {
    const cookie = getCookie();
    return getTokensFromCookie(cookie);
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

export { getSession, getUserSession, getUserTokens };
