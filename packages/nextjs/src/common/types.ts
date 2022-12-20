import { FronteggAppOptions } from '@frontegg/types';
import { ILoginResponse, ITenantsResponse } from '@frontegg/rest-api';
import { IncomingMessage } from 'http';
import { ReactNode } from 'react';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context';
import { NextRouter } from 'next/router';

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

export interface MeAndTenantsResponse {
  user?: ILoginResponse;
  tenants?: ITenantsResponse[];
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

export interface AppEnvConfig {
  envAppUrl?: string;
  envBaseUrl?: string;
  envClientId?: string;
}

export interface FronteggProviderOptions extends Omit<FronteggAppOptions, 'contextOptions'> {
  session?: FronteggNextJSSession;
  envAppUrl: string;
  envBaseUrl: string;
  envClientId: string;
  contextOptions?: Omit<FronteggAppOptions['contextOptions'], 'baseUrl'>;
}

export interface FronteggProviderProps extends FronteggProviderOptions, MeAndTenantsResponse {
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
