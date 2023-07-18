'use client';

import React, { FC, useMemo, useRef } from 'react';
import { FronteggStoreProvider } from '@frontegg/react-hooks';
import { CustomComponentRegister } from '@frontegg/react';
import { ContextHolder } from '@frontegg/rest-api';
import type { FronteggProviderProps } from '../types';
import AppContext from './AppContext';
import initializeFronteggApp from '../utils/initializeFronteggApp';
import useRequestAuthorizeSSR from './useRequestAuthorizeSSR';
import useOnRedirectTo from '../utils/useOnRedirectTo';

const Connector: FC<FronteggProviderProps> = ({ router, appName = 'default', ...props }) => {
  const isSSR = typeof window === 'undefined';
  const { user, session, tenants, activeTenant } = props;
  const baseName = props.basename ?? '';
  const ssrStoreHolder = useRef({});
  const storeHolder = isSSR ? ssrStoreHolder.current : undefined;

  const onRedirectTo = useOnRedirectTo(baseName, router, props.authOptions?.routes);

  const app = useMemo(
    () =>
      initializeFronteggApp({
        options: { ...props, basename: baseName },
        onRedirectTo,
        appName,
        storeHolder,
      }),
    [props]
  );
  ContextHolder.setOnRedirectTo(onRedirectTo);

  // useEffect(() => {
  //   if(window.location.pathname == '/account/login') {
  //     app.store.dispatch({ type: 'auth/requestAuthorize', payload: true });
  //   }
  // }, [app]);
  useRequestAuthorizeSSR({ app, user, tenants, activeTenant, session });
  return (
    <AppContext.Provider value={app}>
      <FronteggStoreProvider
        {...({ ...props, app } as any)}
        alwaysVisibleChildren={!isSSR && <CustomComponentRegister app={app} themeOptions={props.themeOptions} />}
      >
        {props.children}
      </FronteggStoreProvider>
    </AppContext.Provider>
  );
};

export const FronteggBaseProvider: FC<FronteggProviderProps> = (props) => {
  return (
    <Connector {...props} framework={'nextjs'}>
      {props.children}
    </Connector>
  );
};
