import { jwtVerify } from 'jose';
import ConfigManager from '../ConfigManager';
import { FronteggNextJSSession, FronteggUserTokens } from './types';
import JwtPublicKey from '../utils/JwtPublicKey';

type CreateGetSessionParams = {
  getCookie: () => string | undefined;
  cookieResolver: (cookie: string) => Promise<FronteggUserTokens | undefined>;
};

export const createGetSession = async ({
  getCookie,
  cookieResolver,
}: CreateGetSessionParams): Promise<FronteggNextJSSession | undefined> => {
  try {
    const cookie = getCookie();
    if (!cookie) {
      return undefined;
    }
    const tokens = await cookieResolver(cookie);
    if (!tokens?.accessToken) {
      return undefined;
    }
    const { accessToken, refreshToken } = tokens;
    const publicKey = await JwtPublicKey.getKey();
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
  } catch (e) {
    console.error(e);
    return undefined;
  }
};
