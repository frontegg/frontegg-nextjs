import { cookies, headers } from 'next/headers';
import CookieManager from '../utils/cookies';
import createSession from '../utils/createSession';
import encryption from '../utils/encryption';
import { FronteggUserSession, FronteggUserTokens } from '../types';

const getCookie = () => {
  const allCookies = cookies().getAll();
  return CookieManager.parseCookieFromArray(allCookies);
};

export const getSession = () => {
  const cookies = getCookie();
  return createSession(cookies, encryption);
};

export const getHeaders = async (): Promise<Record<string, string>> => {
  const reqHeaders: Record<string, string> = {};
  headers().forEach((value, key) => (reqHeaders[key] = value));
  return reqHeaders;
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
