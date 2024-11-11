import { notFound } from 'next/navigation';
import { ParsedUrlQuery } from 'querystring';
import { isAuthRoute } from '../utils/routing';
import { FronteggRouterBase } from '../common/FronteggRouterBase';
import React from 'react';

interface FronteggRouterSyncProps {
  params: ParsedUrlQuery & { 'frontegg-router'?: string[] };
  searchParams?: ParsedUrlQuery;
}

interface FronteggRouterAsyncProps {
  params: Promise<ParsedUrlQuery & { 'frontegg-router'?: string[] }>;
  searchParams: Promise<ParsedUrlQuery>;
}

type FronteggRouterProps = FronteggRouterSyncProps | FronteggRouterAsyncProps;

export function FronteggAppRouter<T>(routerProps: T) {
  const props = routerProps as FronteggRouterProps;

  const renderAppRouter = (searchParams: ParsedUrlQuery | undefined, pathArr: string[]) => {
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

    return <FronteggRouterBase pathArr={pathArr} queryParams={searchParams} isAppDirEnabled />;
  };

  /**
   * used to avoid type error by supporting both NextJS 15+ and NextJS < 14 versions
   * for promise and non-promise props
   * for more info: https://nextjs.org/docs/messages/sync-dynamic-apis
   */
  // noinspection SuspiciousTypeOfGuard
  if (props.params instanceof Promise || props.searchParams instanceof Promise) {
    const asyncProps: FronteggRouterAsyncProps = props as any;
    return asyncProps.params.then((params) => {
      return asyncProps.searchParams.then((searchParams) => {
        return renderAppRouter(searchParams, params['frontegg-router'] || []);
      });
    });
  }

  return renderAppRouter(props.searchParams, props.params['frontegg-router'] || []);
}
