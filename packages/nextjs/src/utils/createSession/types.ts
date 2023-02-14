import { FronteggUserSession } from '../../common';

export interface FronteggUserTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface FronteggNextJSSession extends FronteggUserTokens {
  user: FronteggUserSession;
}

export interface EncryptionUtils {
  unsealTokens(data: string): Promise<FronteggUserTokens | undefined>;

  sealTokens(tokens: FronteggUserTokens, ttl: number): Promise<string>;
}
