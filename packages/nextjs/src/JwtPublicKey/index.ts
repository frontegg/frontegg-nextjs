import type { KeyLike } from 'jose';
import { importJWK } from 'jose';
import { ApiUrls } from '../api';

/**
 * Get the JWT public key from Frontegg service
 * to verify user's access token when calling getSession
 * in getServerSideProps and ServerComponents
 */
class JwtPublicKey {
  private key: (KeyLike | Uint8Array) | undefined;

  async loadPublicKey(): Promise<KeyLike | Uint8Array> {
    const response = await fetch(ApiUrls.WellKnown.jwks);
    const data = await response.json();
    const publicKey = data.keys[0];
    this.key = await importJWK(publicKey, publicKey.alg);
    return this.key;
  }

  async getKey(): Promise<KeyLike | Uint8Array> {
    if (this.key === undefined) {
      return await this.loadPublicKey();
    }
    return this.key;
  }
}

export default new JwtPublicKey();
