import { FronteggUserSession } from '../../common';

export interface FronteggUserTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface FronteggNextJSSession extends FronteggUserTokens {
  user: FronteggUserSession;
}
