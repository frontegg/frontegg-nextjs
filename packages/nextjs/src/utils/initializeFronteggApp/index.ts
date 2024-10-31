import { AppHolder, FronteggApp, initialize } from '@frontegg/js';
import { createStore, AuthState } from '@frontegg/redux-store';
import { KeyValuePair } from '@frontegg/rest-api';
import { FronteggAppOptions } from '@frontegg/types';
import sdkVersion from '../../sdkVersion';
import type { FronteggProviderOptions } from '../../types';
import nextjsPkg from 'next/package.json';
import { isMiddlewarePath } from '../../api/utils';
import { CommonUrls } from '../common/urls';

type CreateOrGetFronteggAppParams = {
  options: FronteggProviderOptions;
  onRedirectTo: AuthState['onRedirectTo'];
  appName?: string;
  storeHolder: any;
};

const initializeFronteggApp = ({
  options,
  onRedirectTo,
  appName,
  storeHolder,
}: CreateOrGetFronteggAppParams): FronteggApp => {
  const { session, user, tenants, activeTenant } = options;
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
    tokenResolver: options.secureJwtEnabled ? () => '' : undefined,
    baseUrl: (path: string) => {
      if (isMiddlewarePath(path) || options.secureJwtEnabled) {
        return `${options.envAppUrl}/api`;
      } else {
        return options.envBaseUrl;
      }
    },
    beforeRequestInterceptor: (options, url) => {
      /**
       * Determines whether the authorization header should be removed from a request.
       * @param {String} urlStr - The URL of the request.
       */
      try {
        if (url && options.headers) {
          const { pathname, origin } = new URL(url);
          if (typeof window !== 'undefined' && origin != window.location.origin) {
            return { ...options, url };
          }
          if (
            [
              CommonUrls.refreshToken.embedded,
              CommonUrls.refreshToken.hosted,
              CommonUrls.activateAccount.activate,
              CommonUrls.logout,
            ].find((path) => pathname.endsWith(path)) != undefined
          ) {
            delete options.headers['authorization'];
            delete options.headers['Authorization'];
          }
        }
      } catch (e) {
        /** ignore */
      }
      return { ...options, url };
    },
    clientId: options.envClientId,
    appId: options.envAppId,
  };

  const tenantsState = {
    tenants: tenants || [],
    activeTenant,
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
    tenantsState: tenantsState as AuthState['tenantsState'],
  };

  let sharedStore = storeHolder.store;
  if (!sharedStore) {
    sharedStore = createStore({
      context: contextOptions,
      storeHolder,
      previewMode: options.previewMode,
      name: appName ?? 'default',
      urlStrategy: options.urlStrategy,
      builderMode: false,
      initialState: {
        auth: authOptions,
      },
    });
    storeHolder.store = sharedStore;
  }

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
export default initializeFronteggApp;
