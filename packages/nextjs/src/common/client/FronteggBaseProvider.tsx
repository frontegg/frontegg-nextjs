import { FronteggStoreProvider } from '@frontegg/react-hooks';
import { AuthState } from '@frontegg/redux-store';
import { ContextHolder, RedirectOptions } from '@frontegg/rest-api';
import React, { FC, useCallback, useMemo, useRef } from 'react';
import { FronteggProviderProps } from '../types';
import AppContext from './AppContext';
import { createOrGetFronteggApp } from './createOrGetFronteggApp';
import { useRequestAuthorizeSSR } from './hooks';

const Connector: FC<FronteggProviderProps> = ({ router, appName = 'default', ...props }) => {
  const isSSR = typeof window === 'undefined';
  const { user, session, tenants } = props;
  const baseName = props.basename ?? '';
  const ssrStoreHolder = useRef({});
  const storeHolder = isSSR ? ssrStoreHolder.current : undefined;

  const onRedirectTo: AuthState['onRedirectTo'] = useCallback((_path: string, opts?: RedirectOptions) => {
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

  const app = useMemo(
    () =>
      createOrGetFronteggApp({
        options: { ...props, basename: baseName },
        onRedirectTo,
        appName,
        storeHolder,
      }),
    [props]
  );
  ContextHolder.setOnRedirectTo(onRedirectTo);

  useRequestAuthorizeSSR({ app, user, tenants, session });
  return (
    <AppContext.Provider value={app}>
      <FronteggStoreProvider {...({ ...props, app } as any)}>{props.children}</FronteggStoreProvider>
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
