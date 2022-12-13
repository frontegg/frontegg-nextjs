import { FronteggConfig as fronteggConfig } from '../common';
import { authInitialState } from '@frontegg/redux-store';
import { useContext, useEffect } from 'react';
import AppContext from './AppContext';
import { useRouter, notFound } from 'next/navigation';
import { useLoginActions, useLoginWithRedirect } from '@frontegg/react-hooks';
import { ParsedUrlQuery } from 'querystring';

type FronteggRouterProps = {
  params: ParsedUrlQuery & { 'frontegg-router'?: string[] };
  searchParams: ParsedUrlQuery;
};

export function FronteggAppRouter({ params: { 'frontegg-router': pathArr = [] }, searchParams }: FronteggRouterProps) {
  const routesObj = {
    ...authInitialState.routes,
    ...fronteggConfig.authRoutes,
  };
  const routesArr: string[] = Object.keys(routesObj).reduce(
    (p: string[], key: string) => [...p, (routesObj as any)[key]],
    []
  );
  const app = useContext(AppContext);
  const { replace } = useRouter();
  const loginWithRedirect = useLoginWithRedirect();
  const { logout } = useLoginActions();
  let pathname = `/${pathArr.join('/')}`;

  if (!pathname || pathname.startsWith('/_next/data')) {
    const query = searchParams[Object.keys(searchParams)[0]];
    pathname = `/${Array.isArray(query) ? query.join('/') : query}`;
  }
  if (routesArr.indexOf(pathname as string) === -1) {
    notFound();
  }

  if (
    fronteggConfig.fronteggAppOptions.hostedLoginBox &&
    routesObj.loginUrl !== pathname &&
    routesObj.logoutUrl !== pathname &&
    routesObj.hostedLoginRedirectUrl !== pathname
  ) {
    notFound();
  }

  useEffect(() => {
    if (!app) {
      return;
    }
    if (app.options.hostedLoginBox) {
      if (pathname === routesObj.loginUrl) {
        if (searchParams.redirectUrl) {
          localStorage.setItem(
            'FRONTEGG_AFTER_AUTH_REDIRECT_URL',
            `${window.location.origin}${searchParams.redirectUrl}`
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
  }, [app, searchParams, loginWithRedirect, logout, replace]);
  return '';
}
