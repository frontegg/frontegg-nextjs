import { unsealData } from 'iron-session/edge';
import ConfigManager from '../ConfigManager';
import { FronteggUserTokens, RequestType } from '../common/types';
import CookieManager from '../CookieManager';
import { createGetSession } from '../common/createGetSession';

async function getTokensFromCookieOnEdge(cookie: string): Promise<FronteggUserTokens | undefined> {
  const jwt: string = await unsealData(cookie, {
    password: ConfigManager.password,
  });
  return JSON.parse(jwt);
}

export const getSession = (req: RequestType) =>
  createGetSession({
    getCookie: () => CookieManager.getSessionCookieFromRequest(req),
    cookieResolver: getTokensFromCookieOnEdge,
  });
