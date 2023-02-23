import config from '../../config';
import { AppContext } from '../../common/client';
import { authInitialState } from '@frontegg/redux-store';
import URL from 'url';
import { useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useLoginActions, useLoginWithRedirect } from '@frontegg/react-hooks';
import { isAuthRoute } from '../../utils/routing';
import { FRONTEGG_AFTER_AUTH_REDIRECT_URL } from '../../utils/common/constants';
import { ApiUrls, buildLoginRoute, buildLogoutRoute } from '../../api/urls';

export function FronteggAppRouter() {
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
        ...config.authRoutes,
      };

      const { 'frontegg-router': pathArr, ...queryParams } = query as any;
      const pathname = `/${pathArr.join('/')}`;
      if (pathname === routesObj.loginUrl) {
        if (queryParams.redirectUrl) {
          localStorage.setItem(FRONTEGG_AFTER_AUTH_REDIRECT_URL, `${window.location.origin}${queryParams.redirectUrl}`);
        }
        loginWithRedirect();
      } else if (pathname === routesObj.logoutUrl) {
        const _baseUrl = app.options.contextOptions.baseUrl;
        const baseUrl = typeof _baseUrl === 'string' ? _baseUrl : _baseUrl('');
        logout(() => {
          window.location.href = buildLogoutRoute(window.location.origin).asPath;
        });
      }
    }
  }, [app, query, loginWithRedirect, logout, replace]);
  return '';
}

export function FronteggAppRouterProps(context: any) {
  let { pathname } = URL.parse(context.resolvedUrl ?? context.req.url, true);
  if (!pathname || pathname.startsWith('/_next/data')) {
    const query = context.req.query[Object.keys(context.req.query)[0]];
    pathname = `/${Array.isArray(query) ? query.join('/') : query}`;
  }

  const notFound = !isAuthRoute(pathname);

  return {
    notFound,
    props: {},
  };
}
