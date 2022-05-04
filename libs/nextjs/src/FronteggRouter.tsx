import FronteggConfig from './FronteggConfig';
import { authInitialState } from '@frontegg/redux-store';
import { parse } from 'url';

export function FronteggRouter() {
  return ''
}

export function FronteggRouterProps(context: any) {
  const routesObj = {
    ...authInitialState.routes,
    ...FronteggConfig.authRoutes
  };
  const routesArr: string[] = Object.keys(routesObj).reduce((p: string[], key: string) => [ ...p, (routesObj as any)[key] ], []);

  let { pathname } = parse(context.req.url, true);
  if (!pathname || pathname.startsWith('/_next/data')) {
    const query = context.req.query[Object.keys(context.req.query)[0]];
    pathname = `/${Array.isArray(query) ? query.join('/') : query}`;
  }
  const notFound = routesArr.indexOf(pathname as string) === -1;
  return {
    notFound,
    props: {}
  };
}
