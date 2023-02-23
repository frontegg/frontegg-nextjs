import createFetchUserData from '../utils/fetchUserData';
import { cookies, headers } from 'next/headers';
import CookieManager from '../utils/cookies';
import createSession from '../utils/createSession';
import encryption from '../utils/encryption';

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
