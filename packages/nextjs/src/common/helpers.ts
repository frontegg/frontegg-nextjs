import { sealData, unsealData } from 'iron-session';
import { jwtVerify } from 'jose';
import { getTenants, getUsers } from './api';
import { calculateExpiresInFromExp } from './client/ExpireInListener';
import FronteggConfig from './FronteggConfig';
import { FronteggNextJSSession, FronteggUserTokens, AllUserData } from './types';

export async function createSessionFromAccessToken(output: string): Promise<[string, any, string] | []> {
  try {
    const data = JSON.parse(output);
    const accessToken = data?.accessToken ?? data.access_token;
    const refreshToken = data?.refreshToken ?? data.refresh_token;
    const publicKey = await FronteggConfig.getJwtPublicKey();
    const { payload: decodedJwt }: any = await jwtVerify(accessToken, publicKey);
    decodedJwt.expiresIn = Math.floor((decodedJwt.exp * 1000 - Date.now()) / 1000);

    const stringifySession = JSON.stringify({ accessToken, refreshToken });
    const session = await sealData(stringifySession, {
      password: FronteggConfig.passwordsAsMap,
      ttl: decodedJwt.exp,
    });
    return [session, decodedJwt, refreshToken];
  } catch (e) {
    return [];
  }
}

export async function getTokensFromCookie(cookie?: string): Promise<FronteggUserTokens | undefined> {
  if (!cookie) {
    return undefined;
  }
  const stringifyJwt: string = await unsealData(cookie, {
    password: FronteggConfig.passwordsAsMap,
  });
  return JSON.parse(stringifyJwt);
}

type UserDataArguments = {
  getSession: () => Promise<FronteggNextJSSession | undefined>;
  reqHeaders: Record<string, string | string[] | undefined>;
};

export const getAllUserData = async ({ getSession, reqHeaders }: UserDataArguments): Promise<Partial<AllUserData>> => {
  try {
    const session = await getSession();
    if (!session) return {};
    const headers = { ...reqHeaders, Authorization: `Bearer ${session.accessToken}` };
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
  } catch {
    return {};
  }
};
