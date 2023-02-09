import { unsealData } from 'iron-session/edge';
import FronteggConfig from '../utils/FronteggConfig';
import { FronteggUserTokens, RequestType } from '../common/types';
import CookieManager from '../utils/CookieManager';
import { createGetSession } from '../common/createGetSession';

async function getTokensFromCookieOnEdge(cookie: string): Promise<FronteggUserTokens | undefined> {
  const jwt: string = await unsealData(cookie, {
    password: FronteggConfig.password,
  });
  return JSON.parse(jwt);
}

export const getSession = (req: RequestType) =>
  createGetSession({
    getCookie: () => CookieManager.getParsedCookieFromRequest(req),
    cookieResolver: getTokensFromCookieOnEdge,
  });
