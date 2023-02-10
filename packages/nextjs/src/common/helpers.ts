import { sealData, unsealData } from 'iron-session';
import { jwtVerify } from 'jose';
import { getTenants, getUsers } from './api';
import FronteggConfig from '../utils/FronteggConfig';
import { FronteggNextJSSession, FronteggUserTokens, AllUserData } from './types';
import JwtPublicKey from '../utils/JwtPublicKey';
const calculateExpiresInFromExp = (exp: number) => Math.floor((exp * 1000 - Date.now()) / 1000);

export async function createSessionFromAccessToken(data: any): Promise<[string, any, string] | []> {
  const accessToken = data.accessToken ?? data.access_token;
  const refreshToken = data.refreshToken ?? data.refresh_token;
  const publicKey = await JwtPublicKey.getKey();
  const { payload: decodedJwt }: any = await jwtVerify(accessToken, publicKey);
  decodedJwt.expiresIn = Math.floor((decodedJwt.exp * 1000 - Date.now()) / 1000);

  const stringifySession = JSON.stringify({ accessToken, refreshToken });
  const session = await sealData(stringifySession, {
    password: FronteggConfig.password,
    ttl: decodedJwt.exp,
  });
  return [session, decodedJwt, refreshToken];
}

export async function getTokensFromCookie(cookie?: string): Promise<FronteggUserTokens | undefined> {
  if (!cookie) {
    return undefined;
  }
  const stringifyJwt: string = await unsealData(cookie, {
    password: FronteggConfig.password,
  });
  return JSON.parse(stringifyJwt);
}

type UserDataArguments = {
  getSession: () => Promise<FronteggNextJSSession | undefined | null>;
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
  } catch (e) {
    console.error(e);
    return {};
  }
};
