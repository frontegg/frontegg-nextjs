import { unsealData } from 'iron-session/edge';
import { FronteggNextJSSession, RequestType, FronteggUserTokens } from '../common/types';
import FronteggConfig from '../common/FronteggConfig';
import { getCookieFromRequest, getSessionFromCookie } from '../common/utils';

async function getTokensFromCookieOnEdge(cookie?: string): Promise<FronteggUserTokens | undefined> {
  if (!cookie) {
    return undefined;
  }
  const jwt: string = await unsealData(cookie, {
    password: FronteggConfig.passwordsAsMap,
  });
  return JSON.parse(jwt);
}

export async function getSession(req: RequestType): Promise<FronteggNextJSSession | undefined> {
  try {
    const sealFromCookies = getCookieFromRequest(req);
    return getSessionFromCookie(sealFromCookies, getTokensFromCookieOnEdge);
  } catch (e) {
    console.error(e);
    return undefined;
  }
}
