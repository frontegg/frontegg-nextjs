import { FronteggConfig } from './common';
import { authInitialState } from '@frontegg/redux-store';
import { parse } from 'url';
import { useContext, useEffect } from 'react';
import { AppContext } from './client';
import { useRouter } from 'next/router';
import { useLoginActions, useLoginWithRedirect } from '@frontegg/react-hooks';

export function FronteggRouter() {
  const app = useContext(AppContext);
  const { query, replace } = useRouter();
  const loginWithRedirect = useLoginWithRedirect();
  const { logout } = useLoginActions();

  useEffect(() => {
    if (!app) {
      return;
    }
    if (app.options.hostedLoginBox) {
      const routesObj = {
        ...authInitialState.routes,
        ...FronteggConfig.authRoutes,
      };

      const { 'frontegg-router': pathArr, ...queryParams } = query as any;
      const pathname = `/${pathArr.join('/')}`;
      if (pathname === routesObj.loginUrl) {
        if (queryParams.redirectUrl) {
          localStorage.setItem(
            'FRONTEGG_AFTER_AUTH_REDIRECT_URL',
            `${window.location.origin}${queryParams.redirectUrl}`
          );
        }
        loginWithRedirect();
      } else if (pathname === routesObj.logoutUrl) {
        const _baseUrl = app.options.contextOptions.baseUrl;
        const baseUrl = typeof _baseUrl === 'string' ? _baseUrl : _baseUrl('');
        logout(() => {
          window.location.href = `${baseUrl}/oauth/logout?post_logout_redirect_uri=${encodeURIComponent(
            window.location.origin
          )}`;
        });
      }
    }
  }, [app, query, loginWithRedirect, logout, replace]);
  return '';
}

export function FronteggRouterProps(context: any) {
  const routesObj = {
    ...authInitialState.routes,
    ...FronteggConfig.authRoutes,
  };
  const routesArr: string[] = Object.keys(routesObj).reduce(
    (p: string[], key: string) => [...p, (routesObj as any)[key]],
    []
  );

  let { pathname } = parse(context.resolvedUrl ?? context.req.url, true);
  if (!pathname || pathname.startsWith('/_next/data')) {
    const query = context.req.query[Object.keys(context.req.query)[0]];
    pathname = `/${Array.isArray(query) ? query.join('/') : query}`;
  }
  const notFound = routesArr.indexOf(pathname as string) === -1;

  if (FronteggConfig.fronteggAppOptions.hostedLoginBox) {
    const notFound = !(
      routesObj.loginUrl === pathname ||
      routesObj.logoutUrl === pathname ||
      routesObj.hostedLoginRedirectUrl === pathname
    );
    return { notFound, props: {} };
  }
  return {
    notFound,
    props: {},
  };
}
