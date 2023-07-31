import { cookies, headers } from 'next/headers';
import CookieManager from '../utils/cookies';
import createSession from '../utils/createSession';
import encryption from '../utils/encryption';
import { FronteggUserSession, FronteggUserTokens } from '../types';

const getCookie = () => {
  const allCookies = cookies().getAll();
  return CookieManager.parseCookieFromArray(allCookies);
};

export const getAppSession = () => {
  const cookies = getCookie();
  return createSession(cookies, encryption);
};

export const getAppHeaders = (): Record<string, string> => {
  const reqHeaders: Record<string, string> = {};
  headers().forEach((value, key) => (reqHeaders[key] = value));
  return reqHeaders;
};

export const getAppHeadersPromise = async (): Promise<Record<string, string>> => {
  return getAppHeaders();
};

export async function getAppUserSession(): Promise<FronteggUserSession | undefined> {
  const session = await getAppSession();
  return session?.user;
}

export async function getAppUserTokens(): Promise<FronteggUserTokens | undefined> {
  const session = await getAppSession();
  if (!session) {
    return undefined;
  }
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}
