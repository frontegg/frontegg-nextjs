import FronteggConfig from './FronteggConfig';
import { authInitialState } from '@frontegg/redux-store';
import { parse } from 'url';
import { useContext, useEffect } from 'react';
import AppContext from './AppContext';
import { useRouter } from 'next/router';
import { useLoginWithRedirect } from '@frontegg/react-hooks';

export function FronteggRouter() {
  const app = useContext(AppContext);
  const { query } = useRouter();
  const loginWithRedirect = useLoginWithRedirect()
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
        loginWithRedirect()
      } else {
        console.log('NO', pathname, queryParams)
      }
    }
  }, [ app, query, loginWithRedirect ])
  return '';
}

export function FronteggRouterProps(context: any) {
  const routesObj = {
    ...authInitialState.routes,
    ...FronteggConfig.authRoutes,
  };
  const routesArr: string[] = Object.keys(routesObj).reduce(
    (p: string[], key: string) => [ ...p, (routesObj as any)[key] ],
    []
  );

  let { pathname } = parse(context.req.url, true);
  if (!pathname || pathname.startsWith('/_next/data')) {
    const query = context.req.query[Object.keys(context.req.query)[0]];
    pathname = `/${Array.isArray(query) ? query.join('/') : query}`;
  }
  const notFound = routesArr.indexOf(pathname as string) === -1;

  if (FronteggConfig.fronteggAppOptions.hostedLoginBox) {
    const notFound = !(routesObj.loginUrl === pathname || routesObj.hostedLoginRedirectUrl === pathname);
    return { notFound, props: {} }
  }
  return {
    notFound,
    props: {},
  };
}
