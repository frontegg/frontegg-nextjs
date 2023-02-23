import { getTenants, getUsers } from '../api';
import { FronteggNextJSSession, FronteggUserTokens, AllUserData } from '../types';
import JwtManager from '../utils/jwt';
import encryptionUtils from '../utils/encryption';
import { fronteggAuthApiRoutes } from '@frontegg/rest-api';

const calculateExpiresInFromExp = (exp: number) => Math.floor((exp * 1000 - Date.now()) / 1000);

export async function createSessionFromAccessToken(data: any): Promise<[string, any, string] | []> {
  const accessToken = data.accessToken ?? data.access_token;
  const refreshToken = data.refreshToken ?? data.refresh_token;
  const { payload: decodedJwt }: any = await JwtManager.verify(accessToken);
  decodedJwt.expiresIn = Math.floor((decodedJwt.exp * 1000 - Date.now()) / 1000);

  const tokens = { accessToken, refreshToken };
  const session = await encryptionUtils.sealTokens(tokens, decodedJwt.exp);
  return [session, decodedJwt, refreshToken];
}

export async function getTokensFromCookie(cookie?: string): Promise<FronteggUserTokens | undefined> {
  if (!cookie) {
    return undefined;
  }
  return await encryptionUtils.unsealTokens(cookie);
}

type UserDataArguments = {
  getSession: () => Promise<FronteggNextJSSession | undefined | null>;
  reqHeaders: Record<string, string | string[] | undefined>;
};

export const getAllUserData = async ({ getSession, reqHeaders }: UserDataArguments): Promise<Partial<AllUserData>> => {
  try {
    const session = await getSession();
    if (!session) return {};

    const headers = { ...reqHeaders, authorization: `Bearer ${session.accessToken}` };
    const [baseUser, tenants] = await Promise.all([getUsers(headers), getTenants(headers)]);

    if (!baseUser || !tenants) return {};
    const user =
      baseUser && session
        ? {
            ...session.user,
            ...baseUser,
            expiresIn: calculateExpiresInFromExp(session.user.exp),
          }
        : undefined;
    return { user, session, tenants };
  } catch (e) {
    console.error(e);
    return {};
  }
};

export const isAuthPath = (path: string) =>
  fronteggAuthApiRoutes.indexOf(path) !== -1 || path.endsWith('/postlogin') || path.endsWith('/prelogin');

export const isSocialLoginPath = (path: string) =>
  RegExp('^/identity/resources/auth/v[0-9]*/user/sso/default/.*/prelogin$').test(path);
