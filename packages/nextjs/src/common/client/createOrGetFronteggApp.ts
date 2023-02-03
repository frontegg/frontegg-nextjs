import { AppHolder, FronteggApp, initialize } from '@frontegg/js';
import {
  createFronteggStore,
  AuthState,
  tenantsState as defaultTenantsState,
  authInitialState,
} from '@frontegg/redux-store';
import { fronteggAuthApiRoutes, KeyValuePair } from '@frontegg/rest-api';
import { FronteggAppOptions } from '@frontegg/types';
import sdkVersion from '../../sdkVersion';
import { FronteggProviderOptions } from '../types';
import nextjsPkg from 'next/package.json';

type CreateOrGetFronteggAppParams = {
  options: FronteggProviderOptions;
  onRedirectTo: AuthState['onRedirectTo'];
  appName?: string;
  storeHolder: any;
};

export const createOrGetFronteggApp = ({
  options,
  onRedirectTo,
  appName,
  storeHolder,
}: CreateOrGetFronteggAppParams): FronteggApp => {
  const { session, user, tenants } = options;
  const { accessToken, refreshToken } = session ?? {};

  const contextOptions: FronteggAppOptions['contextOptions'] = {
    requestCredentials: 'include' as RequestCredentials,
    ...options.contextOptions,
    additionalHeadersResolver: async () => {
      const additionalHeaders: KeyValuePair[] = [];
      const originalAdditionalHeadersResolver = options.contextOptions?.additionalHeadersResolver;
      if (typeof originalAdditionalHeadersResolver === 'function') {
        try {
          additionalHeaders.push(...(await originalAdditionalHeadersResolver()));
        } catch (e) {
          /** ignore failed additionalHeadersResolver */
        }
      } else if (Array.isArray(originalAdditionalHeadersResolver)) {
        additionalHeaders.push(...(originalAdditionalHeadersResolver as KeyValuePair[]));
      }
      additionalHeaders.push({
        key: 'x-frontegg-framework',
        value: `next@${nextjsPkg.version}`,
      });
      additionalHeaders.push({
        key: 'x-frontegg-sdk',
        value: `@frontegg/nextjs@${sdkVersion.version}`,
      });
      return additionalHeaders;
    },
    baseUrl: (path: string) => {
      if (path.endsWith('/oauth/logout') && typeof window !== 'undefined') {
        const logoutPath = options.authOptions?.routes?.logoutUrl || authInitialState.routes.logoutUrl;
        if (window.location.pathname != logoutPath) {
          // clear fe_nextjs session before logout from hosted login
          // @ts-ignore
          window.location.href = logoutPath;
        }
        return options.envBaseUrl;
      }
      if (fronteggAuthApiRoutes.indexOf(path) !== -1 || path.endsWith('/postlogin') || path.endsWith('/prelogin')) {
        /**
         * Exclude social login redirects from nextjs middleware
         */
        if (RegExp('^/identity/resources/auth/v[0-9]*/user/sso/default/.*/prelogin$').test(path)) {
          return options.envBaseUrl;
        }
        return `${options.envAppUrl}/api`;
      } else {
        return options.envBaseUrl;
      }
    },
    clientId: options.envClientId,
  };

  const tenantsState = {
    ...defaultTenantsState,
    tenants: tenants || [],
    ...options.authOptions?.tenantsState,
  };
  const userData = user
    ? {
        ...user,
        accessToken: accessToken ?? '',
        refreshToken: refreshToken ?? undefined,
        ...options.authOptions?.user,
      }
    : null;

  const authOptions: FronteggAppOptions['authOptions'] = {
    ...options.authOptions,
    onRedirectTo,
    isLoading: false,
    isAuthenticated: !!options.session,
    hostedLoginBox: options.hostedLoginBox ?? false,
    disableSilentRefresh: options.authOptions?.disableSilentRefresh ?? true,
    user: userData,
    tenantsState,
  };

  const sharedStore = createFronteggStore(
    { context: contextOptions },
    storeHolder,
    options.previewMode,
    authOptions,
    {
      auth: authOptions ?? {},
      audits: options.auditsOptions ?? {},
    },
    false,
    options.urlStrategy
  );

  let createdApp;
  try {
    createdApp = AppHolder.getInstance(appName ?? 'default');
    createdApp.store = sharedStore;
  } catch (e) {
    createdApp = initialize(
      {
        ...options,
        store: sharedStore,
        hostedLoginBox: options.hostedLoginBox ?? false,
        customLoginBox: options.customLoginBox ?? false,
        basename: options.basename,
        authOptions,
        contextOptions,
        onRedirectTo,
      },
      appName ?? 'default'
    );
  }
  return createdApp;
};
