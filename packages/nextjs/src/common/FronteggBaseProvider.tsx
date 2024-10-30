'use client';

import React, { FC, useEffect, useMemo, useRef } from 'react';
import { FronteggStoreProvider, CustomComponentRegister, useAuthActions } from '@frontegg/react-hooks';
import { ContextHolder } from '@frontegg/rest-api';
import type { FronteggProviderProps } from '../types';
import AppContext from './AppContext';
import initializeFronteggApp from '../utils/initializeFronteggApp';
import useRequestAuthorizeSSR from './useRequestAuthorizeSSR';
import useOnRedirectTo from '../utils/useOnRedirectTo';
import config from '../config';

const SSGRequestAuthorize: FC<{ isSSG?: boolean; shouldRequestAuthorize?: boolean }> = ({
  isSSG,
  shouldRequestAuthorize,
}) => {
  const { requestAuthorize, setAuthState } = useAuthActions();

  useEffect(
    () => {
      if (isSSG && shouldRequestAuthorize && process.env.NODE_ENV === 'production') {
        console.warn('Landing on SSG page, should request authorize to update store');
        setAuthState({ silentRefreshing: true } as any);
        requestAuthorize().then(() => {
          setAuthState({ silentRefreshing: false } as any);
        });
      }
    },
    [
      /* DON'T add any dependency to make sure this useEffect called once on app mount */
    ]
  );

  return <></>;
};

const Connector: FC<FronteggProviderProps> = ({ router, appName = 'default', ...props }) => {
  const isSSR = typeof window === 'undefined';
  const { user, session, tenants, activeTenant } = props;
  const baseName = props.basename ?? '';
  const storeHolder = useRef({});

  const onRedirectTo = useOnRedirectTo(baseName, router, props.authOptions?.routes);

  const app = useMemo(
    () =>
      initializeFronteggApp({
        options: { ...props, basename: baseName },
        onRedirectTo,
        appName,
        storeHolder: storeHolder.current,
      }),
    [props]
  );
  ContextHolder.for(appName).setOnRedirectTo(onRedirectTo);

  if (props.shouldRequestAuthorize && !props.isSSG) {
    if (session?.accessToken) {
      ContextHolder.for(appName).setAccessToken(session?.accessToken ?? null);
    }
    if (user) {
      ContextHolder.for(appName).setUser(user);
    }
    useRequestAuthorizeSSR({ app, user, tenants, activeTenant, session });
  }

  const alwaysVisibleChildren = isSSR ? undefined : (
    <>
      <SSGRequestAuthorize isSSG={props.isSSG} shouldRequestAuthorize={props.shouldRequestAuthorize} />
      <CustomComponentRegister app={app} themeOptions={props.themeOptions} />
    </>
  );
  return (
    <AppContext.Provider value={app}>
      <FronteggStoreProvider {...({ ...props, app } as any)} alwaysVisibleChildren={alwaysVisibleChildren}>
        {props.children}
      </FronteggStoreProvider>
    </AppContext.Provider>
  );
};

export const FronteggBaseProvider: FC<FronteggProviderProps> = (props) => {
  config.fronteggAppOptions = props ?? {};

  return (
    <Connector {...props} framework={'nextjs'}>
      {props.children}
    </Connector>
  );
};
