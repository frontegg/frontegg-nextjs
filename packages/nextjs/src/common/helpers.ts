import type { FronteggUserTokens } from '../types';
import JwtManager from '../utils/jwt';
import encryptionUtils from '../utils/encryption';

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
