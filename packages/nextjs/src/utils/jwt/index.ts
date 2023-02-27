import type { KeyLike } from 'jose';
import { importJWK, jwtVerify } from 'jose';
import api from '../../api';
import type { JWTVerifyResult } from 'jose/dist/types/types';
import fronteggLogger from '../fronteggLogger';
import config from '../../config';

class JwtUtils {
  private publicKey: (KeyLike | Uint8Array) | undefined;

  /**
   * Get the JWT public key from Frontegg service
   * to verify user's access token when calling getSession
   * in getServerSideProps and ServerComponents
   * @private
   */
  private async loadPublicKey(): Promise<KeyLike | Uint8Array> {
    const logger = fronteggLogger.child({ tag: 'JwtManager.loadPublicKey' });

    let publicKey;
    try {
      logger.info('Check if public key env variable found');
      publicKey = JSON.parse(config.jwtPublicKeyJson ?? '{}');
      publicKey.alg;
    } catch (e) {
      logger.info('Going to load public key from frontegg jwks');
      publicKey = await api.loadPublicKey();
    }
    logger.info('Public key loaded, importing to jose');
    this.publicKey = await importJWK(publicKey, publicKey.alg);
    return this.publicKey;
  }

  /**
   * Load public key from Frontegg services if not cached
   * @private
   */
  private async getPublicKey(): Promise<KeyLike | Uint8Array> {
    if (this.publicKey === undefined) {
      return await this.loadPublicKey();
    }
    return this.publicKey;
  }

  /**
   * verify JWT token with current loaded public key from Frontegg services
   */
  async verify(jwt: string | Uint8Array): Promise<JWTVerifyResult> {
    const publicKey = await this.getPublicKey();
    return await jwtVerify(jwt, publicKey);
  }
}

export default new JwtUtils();
