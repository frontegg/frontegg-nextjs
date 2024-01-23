import { AppHolder, FronteggApp, initialize } from '@frontegg/js';
import { createFronteggStore, AuthState, tenantsState as defaultTenantsState } from '@frontegg/redux-store';
import { KeyValuePair } from '@frontegg/rest-api';
import { FronteggAppOptions } from '@frontegg/types';
import sdkVersion from '../../sdkVersion';
import type { FronteggProviderOptions } from '../../types';
import nextjsPkg from 'next/package.json';
import { isMiddlewarePath } from '../../api/utils';

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
    baseUrl: (path: string) => {
      if (isMiddlewarePath(path)) {
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
    tenantsState,
  };

  const sharedStore = createFronteggStore(
    { context: contextOptions, appName: appName ?? 'default' },
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

export default initializeFronteggApp;
