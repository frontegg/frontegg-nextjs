import type { FronteggAppOptions } from '@frontegg/types';
import type { ILoginResponse, ITenantsResponse } from '@frontegg/rest-api';
import type { IncomingMessage } from 'http';
import type { ReactNode } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context';
import type { NextRouter } from 'next/router';

export interface EncryptionUtils {
  unsealTokens(data: string): Promise<FronteggUserTokens | undefined>;

  sealTokens(tokens: FronteggUserTokens, ttl: number): Promise<string>;
}

export interface FronteggUserTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface FronteggNextJSSession extends FronteggUserTokens {
  user: FronteggUserSession;
}

export type RequestType = IncomingMessage | Request;

export interface AccountEnvironment {
  id: string;
  createdAt: string;
  environment: 'production' | 'development';
}

export interface CustomClaims {
  accountEnvironments: AccountEnvironment[];
}

export interface FronteggUserTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AllUserData {
  user?: ILoginResponse | null;
  tenants?: ITenantsResponse[] | null;
  session?: FronteggNextJSSession | null;
}
export interface FronteggUserSession {
  sub: string;
  name: string;
  email: string;
  email_verified: boolean;
  metadata: any;
  roles: string[];
  permissions: string[];
  tenantId: string;
  tenantIds: string[];
  profilePictureUrl: string;
  type: string; // "userToken"
  customClaims: CustomClaims;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

export interface FronteggNextJSSession extends FronteggUserTokens {
  user: FronteggUserSession;
}

export interface FronteggProviderOptions extends Omit<FronteggAppOptions, 'contextOptions'>, AllUserData {
  envAppUrl: string;
  envBaseUrl: string;
  envClientId: string;
  contextOptions?: Omit<FronteggAppOptions['contextOptions'], 'baseUrl'>;
}

export interface FronteggProviderProps extends FronteggProviderOptions {
  children?: ReactNode;
  router: AppRouterInstance | NextRouter;
  appName?: string;
}

declare module 'iron-session' {
  interface IronSessionData {
    accessToken: FronteggNextJSSession['accessToken'];
    user: FronteggNextJSSession['user'];
  }
}

declare global {
  interface ProcessEnv {
    FRONTEGG_BASE_URL: string;
    PORT?: string;
    PWD: string;
  }
}
