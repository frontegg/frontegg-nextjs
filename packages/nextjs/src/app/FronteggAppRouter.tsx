'use client';

import { AppContext } from '../common';
import { useContext, useEffect } from 'react';
import { useRouter, notFound } from 'next/navigation';
import { useLoginActions, useLoginWithRedirect } from '@frontegg/react-hooks';
import { ParsedUrlQuery } from 'querystring';
import { getAuthRoutes, isAuthRoute } from '../utils/routing';
import { FRONTEGG_AFTER_AUTH_REDIRECT_URL } from '../utils/common/constants';

interface FronteggRouterProps {
  params: ParsedUrlQuery & { 'frontegg-router'?: string[] };
  searchParams?: ParsedUrlQuery;
}

export function FronteggAppRouter({ params: { 'frontegg-router': pathArr = [] }, searchParams }: FronteggRouterProps) {
  const app = useContext(AppContext);

  const { replace } = useRouter();
  const { routesObj } = getAuthRoutes();
  const loginWithRedirect = useLoginWithRedirect();
  const { logout } = useLoginActions();

  let pathname = `/${pathArr.join('/')}`;
  if (!pathname || pathname.startsWith('/_next/data')) {
    if (searchParams) {
      const query = searchParams[Object.keys(searchParams)[0]];
      pathname = `/${Array.isArray(query) ? query.join('/') : query}`;
    } else {
      notFound();
      return null;
    }
  }

  if (!isAuthRoute(pathname)) {
    notFound();
    return null;
  }

  useEffect(() => {
    if (!app) {
      return;
    }
    if (app.options.hostedLoginBox) {
      if (pathname === routesObj.loginUrl) {
        if (searchParams?.redirectUrl) {
          window.localStorage.setItem(
            FRONTEGG_AFTER_AUTH_REDIRECT_URL,
            `${window.location.origin}${searchParams?.redirectUrl}`
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
  return null;
}
