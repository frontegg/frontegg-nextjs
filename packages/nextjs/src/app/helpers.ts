import { cookies, headers } from 'next/headers';
import CookieManager from '../utils/cookies';
import createSession from '../utils/createSession';
import encryption from '../utils/encryption';
import { FronteggUserSession, FronteggUserTokens } from '../types';

/**
 * Support for Next.js 15 breaking changes, where props.params is now a promise-based function
 * for more info: https://nextjs.org/docs/messages/sync-dynamic-apis
 * @param obj
 * @param key
 */
export async function handleOptionalPromiseObject(obj: any, key: string) {
  let value;

  if (typeof obj[key] === 'function') {
    // In case props.params is now a promise-based function
    value = await obj?.[key]?.();
  } else {
    // If props.params is still an object
    value = obj?.[key];
  }

  return value;
}

/**
 * Support for Next.js 15 breaking changes, where cookies() are now promise-based functions
 * for more info: https://nextjs.org/docs/messages/sync-dynamic-apis
 * @param func
 */
async function getRequestCookies() {
  let value = cookies();

  // noinspection SuspiciousTypeOfGuard
  if (value instanceof Promise) {
    return await value;
  }
  return value;
}

/**
 * Support for Next.js 15 breaking changes, where cookies() are now promise-based functions
 * for more info: https://nextjs.org/docs/messages/sync-dynamic-apis
 * @param func
 */
async function getRequestHeaders() {
  let value = headers();

  // noinspection SuspiciousTypeOfGuard
  if (value instanceof Promise) {
    return await value;
  }
  return value;
}

const getCookie = async () => {
  const allCookies = (await getRequestCookies()).getAll();
  return CookieManager.parseCookieFromArray(allCookies);
};

export const getAppSession = async () => {
  const cookies = await getCookie();
  return createSession(cookies, encryption);
};

export const getAppHeaders = async (): Promise<Record<string, string>> => {
  const reqHeaders: Record<string, string> = {};
  (await getRequestHeaders()).forEach((value: string, key: string) => (reqHeaders[key] = value));
  return reqHeaders;
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
