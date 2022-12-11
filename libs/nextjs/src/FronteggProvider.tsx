import React, {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { initialize, AppHolder, FronteggApp } from '@frontegg/js';
import { FronteggAppOptions } from '@frontegg/types';
import { createFronteggStore, AuthState } from '@frontegg/redux-store';
import {
  FronteggStoreProvider,
  useAuthActions,
  useAuthUserOrNull,
} from '@frontegg/react-hooks';
import {
  ContextHolder,
  RedirectOptions,
  fronteggAuthApiRoutes,
} from '@frontegg/rest-api';
import { NextRouter, useRouter } from 'next/router';
import { MeAndTenants, FronteggNextJSSession } from './types';
import AppContext from './AppContext';

export type FronteggProviderProps = Omit<FronteggAppOptions, 'contextOptions'> &
  MeAndTenants & {
    children?: ReactNode;
    session?: FronteggNextJSSession;
    envAppUrl: string;
    envBaseUrl: string;
    envClientId: string;
    contextOptions?: Omit<FronteggAppOptions['contextOptions'], 'baseUrl'>;
  };

type ConnectorProps = FronteggProviderProps & {
  router: NextRouter;
  appName?: string;
};

const Connector: FC<ConnectorProps> = ({
  router,
  appName,
  hostedLoginBox,
  customLoginBox,
  user,
  tenants,
  session,
  ...props
}) => {
  const { accessToken, refreshToken } = session ?? {};
  const isSSR = typeof window === 'undefined';
  const storeHolder = useRef({});

  const baseName = props.basename ?? router.basePath;

  const onRedirectTo: AuthState['onRedirectTo'] = useCallback(
    (_path: string, opts?: RedirectOptions) => {
      let path = _path;
      if (path.startsWith(baseName)) {
        path = path.substring(baseName.length);
      }
      if (opts?.preserveQueryParams) {
        path = `${path}${window.location.search}`;
      }
      if (opts?.refresh && !isSSR) {
        // @ts-ignore
        window.Cypress ? router.push(path) : (window.location.href = path);
      } else {
        opts?.replace ? router.replace(path) : router.push(path);
      }
    },
    []
  );

  const contextOptions: FronteggAppOptions['contextOptions'] = useMemo(
    () => ({
      requestCredentials: 'include' as RequestCredentials,
      ...props.contextOptions,
      baseUrl: (path: string) => {
        if (
          fronteggAuthApiRoutes.indexOf(path) !== -1 ||
          path.endsWith('/postlogin') ||
          path.endsWith('/prelogin') ||
          path === '/oauth/token'
        ) {
          return `${props.envAppUrl}/api`;
        } else {
          return props.envBaseUrl;
        }
      },
      clientId: props.envClientId,
    }),
    [props.envAppUrl, props.envBaseUrl, props.envClientId, props.contextOptions]
  );

  const authOptions: FronteggAppOptions['authOptions'] = useMemo(() => {
    const tenantsState = tenants
      ? {
          tenantTree: null,
          subTenants: [],
          tenants,
          loading: false,
          ...props.authOptions?.tenantsState,
        }
      : undefined;
    const userData = user
      ? {
          ...user,
          accessToken: accessToken ?? '',
          refreshToken: refreshToken ?? undefined,
          ...props.authOptions?.user,
        }
      : null;
    return {
      ...props.authOptions,
      onRedirectTo,
      isLoading: false,
      isAuthenticated: !!session,
      hostedLoginBox: hostedLoginBox ?? false,
      disableSilentRefresh: props.authOptions?.disableSilentRefresh ?? false,
      user: userData,
      tenantsState,
    };
  }, [
    accessToken,
    hostedLoginBox,
    onRedirectTo,
    props.authOptions,
    refreshToken,
    session,
    tenants,
    user,
  ]);

  const sharedStore = useMemo(
    () =>
      createFronteggStore(
        { context: contextOptions },
        storeHolder.current,
        props.previewMode,
        authOptions,
        {
          auth: authOptions ?? {},
          audits: props.auditsOptions ?? {},
        },
        false,
        props.urlStrategy
      ),
    [
      authOptions,
      contextOptions,
      props.auditsOptions,
      props.previewMode,
      props.urlStrategy,
    ]
  );

  const app = useMemo(() => {
    let createdApp;
    try {
      createdApp = AppHolder.getInstance(appName ?? 'default');
      createdApp.store = sharedStore;
    } catch (e) {
      createdApp = initialize(
        {
          ...props,
          store: sharedStore,
          hostedLoginBox: hostedLoginBox ?? false,
          customLoginBox: customLoginBox ?? false,
          basename: props.basename ?? baseName,
          authOptions,
          contextOptions,
          onRedirectTo,
        },
        appName ?? 'default'
      );
    }
    return createdApp;
  }, [
    appName,
    props,
    hostedLoginBox,
    baseName,
    onRedirectTo,
    contextOptions,
    customLoginBox,
    authOptions,
    sharedStore,
  ]);

  ContextHolder.setOnRedirectTo(onRedirectTo);

  useEffect(() => {
    app?.store.dispatch({
      type: 'auth/requestAuthorizeSSR',
      payload: {
        accessToken,
        user: user ? { ...user, refreshToken } : null,
        tenants,
      },
    });
  }, [app]);

  return (
    <AppContext.Provider value={app}>
      <FronteggStoreProvider {...({ ...props, app } as any)}>
        {props.children}
      </FronteggStoreProvider>
    </AppContext.Provider>
  );
};

const ExpireInListener = () => {
  const user = useAuthUserOrNull();
  const actions = useAuthActions();
  useEffect(() => {
    if (user && user?.expiresIn == null) {
      actions.setUser({
        ...user,
        expiresIn: Math.floor(
          ((user as any)['exp'] * 1000 - Date.now()) / 1000
        ),
      });
    }
  }, [actions, user]);
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <></>;
};
const FronteggNextJSProvider: FC<FronteggProviderProps> = (props) => {
  const router = useRouter();

  return (
    <Connector {...props} router={router}>
      <ExpireInListener />
      {props.children}
    </Connector>
  );
};

export const FronteggProvider: FC<FronteggProviderProps> = (props) => {
  return (
    <FronteggNextJSProvider {...props} framework={'nextjs'}>
      {props.children}
    </FronteggNextJSProvider>
  );
};
