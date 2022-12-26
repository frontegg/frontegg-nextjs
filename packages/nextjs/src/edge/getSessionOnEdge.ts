import { unsealData } from 'iron-session/edge';
import FronteggConfig from '../common/FronteggConfig';
import { FronteggUserTokens, RequestType } from '../common/types';
import CookieManager from '../common/CookieManager';
import { createGetSession } from '../common/createGetSession';

async function getTokensFromCookieOnEdge(cookie: string): Promise<FronteggUserTokens | undefined> {
  const jwt: string = await unsealData(cookie, {
    password: FronteggConfig.passwordsAsMap,
  });
  return JSON.parse(jwt);
}

export const getSession = (req: RequestType) =>
  createGetSession({
    getCookie: () => CookieManager.getParsedCookieFromRequest(req),
    cookieResolver: getTokensFromCookieOnEdge,
  });
