'use client';

import { AppHolder, initialize } from '@frontegg/js';
import { FronteggStoreProvider } from '@frontegg/react-hooks';
import { ContextHolder } from '@frontegg/rest-api';
import { FronteggAppOptions } from '@frontegg/types';
import { NextRouter, useRouter } from 'next/router';
import React, { FC, PropsWithChildren, useEffect, useMemo } from 'react';
import AppContext from '../common/AppContext';
import useOnRedirectTo from '../utils/useOnRedirectTo';
import ExpireInListener from './ExpireInListener';

export type FronteggProviderNoSSRProps = PropsWithChildren<FronteggAppOptions>;

type ConnectorProps = PropsWithChildren<FronteggAppOptions> & {
  router: NextRouter;
  appName?: string;
};

const Connector: FC<ConnectorProps> = (_props) => {
  const { router, appName, hostedLoginBox, customLoginBox, ...props } = _props;
  const baseName = props.basename ?? router.basePath;

  const onRedirectTo = useOnRedirectTo(baseName, router, props.authOptions?.routes);

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
  }, [appName, props, hostedLoginBox, baseName, onRedirectTo]);
  ContextHolder.setOnRedirectTo(onRedirectTo);

  useEffect(() => {
    app.store.dispatch({ type: 'auth/requestAuthorize', payload: true });
  }, [app]);

  return (
    <AppContext.Provider value={app}>
      <FronteggStoreProvider {...({ ...props, app } as any)}>{props.children}</FronteggStoreProvider>
    </AppContext.Provider>
  );
};

const FronteggNextJSProvider: FC<FronteggProviderNoSSRProps> = (props) => {
  const router = useRouter();

  return (
    <Connector {...props} router={router}>
      <ExpireInListener />
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
