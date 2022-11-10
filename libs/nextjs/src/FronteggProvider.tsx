import React, { FC, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { initialize, AppHolder } from '@frontegg/js';
import { FronteggAppOptions } from '@frontegg/types';
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
import { FronteggNextJSSession } from './types';
import AppContext from './AppContext';

export type FronteggProviderProps = Omit<FronteggAppOptions, 'contextOptions'> & {
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

const Connector: FC<ConnectorProps> = (_props) => {
  const { router, appName, hostedLoginBox, customLoginBox, ...props } = _props;
  const isSSR = typeof window === 'undefined';

  const baseName = props.basename ?? router.basePath;

  const onRedirectTo = useCallback((_path: string, opts?: RedirectOptions) => {
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
  }, []);

  const contextOptions = useMemo(
    () => ({
      baseUrl: (path: string) => {
        if (fronteggAuthApiRoutes.indexOf(path) !== -1 ||
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
    [ props.envAppUrl, props.envBaseUrl, props.envClientId ]
  );


  const app = useMemo(() => {
    let createdApp;
    try {
      createdApp = AppHolder.getInstance(appName ?? 'default');
    } catch (e) {
      createdApp = initialize(
        {
          ...props,
          hostedLoginBox: hostedLoginBox ?? false,
          basename: props.basename ?? baseName,
          authOptions: {
            ...props.authOptions,
            onRedirectTo,
          },
          contextOptions: {
            requestCredentials: 'include',
            ...props.contextOptions,
            ...contextOptions,
          },
          onRedirectTo,
        },
        appName ?? 'default'
      );
    }
    return createdApp;
  }, [ appName, props, hostedLoginBox, baseName, onRedirectTo, contextOptions ]);
  ContextHolder.setOnRedirectTo(onRedirectTo);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    app.store.dispatch({
      type: 'auth/requestAuthorizeSSR',
      payload: props.session,
    });
  }, [ app ]);

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
  }, [ actions, user ]);
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <></>;
};
const FronteggNextJSProvider: FC<FronteggProviderProps> = (props) => {
  const router = useRouter();

  return (
    <Connector {...props} router={router}>
      <ExpireInListener/>
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
