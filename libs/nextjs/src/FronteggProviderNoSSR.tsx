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
} from '@frontegg/rest-api';
import { NextRouter, useRouter } from 'next/router';
import AppContext from './AppContext';

export type FronteggProviderNoSSRProps = FronteggAppOptions & {
  children?: ReactNode;
};

type ConnectorProps = FronteggProviderNoSSRProps & {
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
          },
          onRedirectTo,
        },
        appName ?? 'default'
      );
    }
    return createdApp;
  }, [ appName, props, hostedLoginBox, baseName, onRedirectTo ]);
  ContextHolder.setOnRedirectTo(onRedirectTo);

  useEffect(() => {
    app.store.dispatch({ type: 'auth/requestAuthorize', payload: true, });
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
const FronteggNextJSProvider: FC<FronteggProviderNoSSRProps> = (props) => {
  const router = useRouter();

  return (
    <Connector {...props} router={router}>
      <ExpireInListener/>
      {props.children}
    </Connector>
  );
};

export const FronteggProviderNoSSR: FC<FronteggProviderNoSSRProps> = (props) => {
  return (
    <FronteggNextJSProvider {...props} framework={'nextjs'}>
      {props.children}
    </FronteggNextJSProvider>
  );
};
