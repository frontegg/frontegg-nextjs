import { useCallback, useMemo, useRef } from 'react';
import { RedirectOptions } from '@frontegg/rest-api';
import type { NextRouter } from 'next/router';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context';
import { isAuthRoute, AuthPageRoutes } from '@frontegg/redux-store';

const useOnRedirectTo = (
  baseName: string,
  router: AppRouterInstance | NextRouter,
  routes?: Partial<AuthPageRoutes>
) => {
  const isAuthRouteRef = useRef<(path: string) => boolean>(() => false);
  const onRedirectTo = useRef((_path: string, opts?: RedirectOptions) => {});

  useMemo(() => {
    isAuthRouteRef.current = (path) => isAuthRoute(path, routes);
  }, [routes]);

  onRedirectTo.current = (_path: string, opts?: RedirectOptions) => {
    const isSSR = typeof window == undefined;
    let path = _path;
    if (path.startsWith(baseName)) {
      path = path.substring(baseName.length);
    }
    if (opts?.preserveQueryParams || isAuthRouteRef.current(path)) {
      path = `${path}${window.location.search}`;
    }
    if (opts?.refresh && !isSSR) {
      // @ts-ignore
      window.Cypress ? router.push(path) : (window.location.href = path);
    } else {
      opts?.replace ? router.replace(path) : router.push(path);
    }
  };

  return onRedirectTo.current;
};

export default useOnRedirectTo;
