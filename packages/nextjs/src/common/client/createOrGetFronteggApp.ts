import { AppHolder, FronteggApp, initialize } from '@frontegg/js';
import { createFronteggStore, AuthState, tenantsState as defaultTenantsState } from '@frontegg/redux-store';
import { fronteggAuthApiRoutes } from '@frontegg/rest-api';
import { FronteggAppOptions } from '@frontegg/types';
import { FronteggProviderOptions } from '../types';

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
    baseUrl: (path: string) => {
      if (fronteggAuthApiRoutes.indexOf(path) !== -1 || path.endsWith('/postlogin') || path.endsWith('/prelogin')) {
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
    storeHolder.current,
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
