'use client';

import { AppHolder, FronteggApp, initialize } from '@frontegg/js';
import { FronteggStoreProvider } from '@frontegg/react-hooks';
import { ContextHolder, ContextOptions } from '@frontegg/rest-api';
import { FronteggAppOptions } from '@frontegg/types';
import { NextRouter, useRouter } from 'next/router';
import React, { FC, PropsWithChildren, ReactNode, useEffect, useRef } from 'react';
import AppContext from '../common/AppContext';
import useOnRedirectTo from '../utils/useOnRedirectTo';
import ExpireInListener from './ExpireInListener';
import { createStore, FronteggStore } from '@frontegg/redux-store';
import NoSSRStoreHolder from './NoSSRStoreHolder';

export type FronteggProviderNoSSRProps = PropsWithChildren<FronteggAppOptions>;

type ConnectorProps = PropsWithChildren<FronteggAppOptions> & {
  alwaysVisibleChildren?: ReactNode;
  router: NextRouter;
  appName?: string;
};

const Connector: FC<ConnectorProps> = (_props) => {
  const { router, appName, hostedLoginBox, customLoginBox, ...props } = _props;
  const baseName = props.basename ?? router.basePath;
  const storeHolderRef = useRef<{ store?: FronteggStore }>({});
  const onRedirectTo = useOnRedirectTo(baseName, router, props.authOptions?.routes);

  const contextOptions: ContextOptions = {
    requestCredentials: 'include',
    ...props.contextOptions,
  };

  const storeHolder = NoSSRStoreHolder.getInstance() ?? storeHolderRef.current;
  let sharedStore = storeHolder.store;
  if (!sharedStore) {
    sharedStore = createStore({
      context: contextOptions,
      storeHolder,
      previewMode: props.previewMode,
      name: appName ?? 'default',
      urlStrategy: props.urlStrategy,
      builderMode: false,
      initialState: {
        auth: {
          ...props.authOptions,
          onRedirectTo,
        },
      },
    });
    storeHolder.store = sharedStore;
    storeHolderRef.current.store = sharedStore;
  }

  let app: FronteggApp;
  try {
    app = AppHolder.getInstance(appName ?? 'default');
    app.store = sharedStore;
  } catch (e) {
    app = initialize(
      {
        ...props,
        store: sharedStore,
        hostedLoginBox: hostedLoginBox ?? false,
        basename: props.basename ?? baseName,
        authOptions: {
          ...props.authOptions,
          onRedirectTo,
        },
        contextOptions,
        onRedirectTo,
      },
      appName ?? 'default'
    );
    app.store.dispatch({ type: 'auth/requestAuthorize', payload: true });
  }

  ContextHolder.for(appName ?? 'default').setOnRedirectTo(onRedirectTo);

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
