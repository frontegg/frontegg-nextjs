import { cookies } from 'next/headers';
import type { FronteggUserSession, FronteggUserTokens } from '../types';
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

export async function getUserSession(): Promise<FronteggUserSession | undefined> {
  const session = await getSession();
  return session?.user;
}

export async function getUserTokens(): Promise<FronteggUserTokens | undefined> {
  const session = await getSession();
  if (!session) {
    return undefined;
  }
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}
