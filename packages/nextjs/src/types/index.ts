import type { FronteggAppOptions } from '@frontegg/types';
import type { ILoginResponse, ITenantsResponse } from '@frontegg/rest-api';
import type { IncomingMessage } from 'http';
import type { ReactNode } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context';
import type { NextRouter } from 'next/router';
import { Config } from '../config';

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
  activeTenant?: ITenantsResponse;
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

type CustomLoginOptionsWithParamKeyType = {
  /**
   *The param key from your tenant login url, for 'frontegg.com?organization=[tenant]' would be 'organization'
   */
  paramKey: string;
  subDomainIndex?: never;
};

type CustomLoginOptionsWithSubDomainType = {
  /**
   *The index of sub domain from your tenant login url, for 'https://[tenant].frontegg.com' would be 0
   */
  subDomainIndex: number;
  paramKey?: never;
};

export type CustomLoginOptionsType = CustomLoginOptionsWithParamKeyType | CustomLoginOptionsWithSubDomainType;

type PagesDirectoryProviderProps = {
  customLoginOptions?: CustomLoginOptionsType;
};

export type ClientFronteggProviderProps = Omit<FronteggProviderProps, 'router'> & PagesDirectoryProviderProps;

declare module 'iron-session' {
  interface IronSessionData {
    accessToken: FronteggNextJSSession['accessToken'];
    user: FronteggNextJSSession['user'];
  }
}

declare global {
  var config: Config | undefined;
  interface ProcessEnv {
    FRONTEGG_BASE_URL: string;
    PORT?: string;
    PWD: string;
  }
}
