import type { KeyLike } from 'jose';
import { importJWK, jwtVerify } from 'jose';
import { ApiUrls } from '../api';
import { JWTVerifyResult } from 'jose/dist/types/types';

class JwtManager {
  private publicKey: (KeyLike | Uint8Array) | undefined;

  /**
   * Get the JWT public key from Frontegg service
   * to verify user's access token when calling getSession
   * in getServerSideProps and ServerComponents
   */
  private async loadPublicKey(): Promise<KeyLike | Uint8Array> {
    const response = await fetch(ApiUrls.WellKnown.jwks);
    const data = await response.json();
    const publicKey = data.keys[0];
    this.publicKey = await importJWK(publicKey, publicKey.alg);
    return this.publicKey;
  }

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

export default new JwtManager();
