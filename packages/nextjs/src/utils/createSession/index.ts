import JwtManager from '../jwt';
import type { EncryptionUtils, FronteggNextJSSession } from '../../types';
import jwt from '../jwt';

export default async function createSession(
  cookie: string | undefined,
  encryption: EncryptionUtils
): Promise<FronteggNextJSSession | undefined> {
  try {
    if (!cookie) {
      return undefined;
    }
    const tokens = await encryption.unsealTokens(cookie);
    if (!tokens?.accessToken) {
      return undefined;
    }
    const { accessToken, refreshToken } = tokens;
    const { payload }: any = await JwtManager.verify(accessToken);

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
}
