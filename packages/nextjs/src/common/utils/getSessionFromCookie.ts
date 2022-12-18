import { jwtVerify } from 'jose';
import fronteggConfig from '../FronteggConfig';
import { FronteggNextJSSession, FronteggUserTokens } from '../types';

type CookieResolver = (cookie: string | undefined) => Promise<FronteggUserTokens | undefined>;

export default async function getSessionFromCookie(
  cookie: string | undefined,
  cookieResolver: CookieResolver
): Promise<FronteggNextJSSession | undefined> {
  const tokens = await cookieResolver(cookie);

  if (!tokens?.accessToken) {
    return undefined;
  }
  const { accessToken, refreshToken } = tokens;
  const publicKey = await fronteggConfig.getJwtPublicKey();
  const { payload }: any = await jwtVerify(accessToken, publicKey);

  const session: FronteggNextJSSession = {
    accessToken,
    user: payload,
    refreshToken,
  };
  if (session.user.exp * 1000 < Date.now()) {
    return undefined;
  }
  return session;
}
