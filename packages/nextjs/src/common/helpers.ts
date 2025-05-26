import type { FronteggUserTokens } from '../types';
import JwtManager from '../utils/jwt';
import encryption from '../utils/encryption';
import { ParsedUrlQuery } from 'querystring';

export async function createSessionFromAccessToken(data: any): Promise<[string, any, string] | []> {
  const accessToken = data.accessToken ?? data.access_token;
  const refreshToken = data.refreshToken ?? data.refresh_token;
  const { payload: decodedJwt }: any = await JwtManager.verify(accessToken);
  decodedJwt.expiresIn = Math.floor((decodedJwt.exp * 1000 - Date.now()) / 1000);

  const tokens = { accessToken, refreshToken };
  const session = await encryption.sealTokens(tokens, decodedJwt.exp);
  return [session, decodedJwt, refreshToken];
}

export async function getTokensFromCookie(cookie?: string): Promise<FronteggUserTokens | undefined> {
  if (!cookie) {
    return undefined;
  }
  return await encryption.unsealTokens(cookie);
}

export const getAfterAuthRedirectUrl = (queryParams: ParsedUrlQuery) => {
  const redirectPath = queryParams.redirectUrl;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(queryParams)) {
    if (key !== 'redirectUrl' && value !== undefined) {
      query.append(key, String(value));
    }
  }

  const redirectUrl = query.toString() ? `${redirectPath}?${query.toString()}` : redirectPath;

  return `${window.location.origin}${redirectUrl}`;
};
