import { unsealData } from 'iron-session/edge';
import config from '../config';
import CookieManager from '../utils/cookies';
import type { FronteggUserTokens, RequestType } from '../common';
import { createGetSession } from '../common/createGetSession';

async function getTokensFromCookieOnEdge(cookie: string): Promise<FronteggUserTokens | undefined> {
  const password = config.password;
  console.log('password', password);
  const jwt: string = await unsealData(cookie, { password });
  return JSON.parse(jwt);
}

export const getSession = (req: RequestType) =>
  createGetSession({
    getCookie: () => CookieManager.getSessionCookieFromRequest(req),
    cookieResolver: getTokensFromCookieOnEdge,
  });
