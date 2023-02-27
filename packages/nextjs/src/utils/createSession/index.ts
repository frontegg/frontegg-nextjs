import JwtManager from '../jwt';
import type { EncryptionUtils, FronteggNextJSSession } from '../../types';
import fronteggLogger from '../fronteggLogger';

export default async function createSession(
  cookie: string | undefined,
  encryption: EncryptionUtils
): Promise<FronteggNextJSSession | undefined> {
  const logger = fronteggLogger.child({ tag: 'SessionCreator.createSession' });
  logger.info('Creating new session');
  try {
    if (!cookie) {
      logger.info('no cookies');
      return undefined;
    }

    logger.debug('decrypting Session cookie');
    const tokens = await encryption.unsealTokens(cookie);
    if (!tokens?.accessToken) {
      logger.info('no accessToken in session');
      return undefined;
    }
    const { accessToken, refreshToken } = tokens;

    logger.debug('Going to verify accessToken');
    const { payload }: any = await JwtManager.verify(accessToken);

    logger.debug('Access token verified successfully');
    const session: FronteggNextJSSession = {
      accessToken,
      user: payload,
      refreshToken,
    };

    logger.debug('Check if access token will expire soon');
    if (session.user.exp * 1000 < Date.now()) {
      return undefined;
    }

    logger.info('Successfully create session object');
    return session;
  } catch (e) {
    logger.error('Failed to create session', e);
    return undefined;
  }
}
