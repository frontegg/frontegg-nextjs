import React from 'react';
import URL from 'url';
import { useRouter } from 'next/router';
import { isAuthRoute } from '../../utils/routing';
import { FronteggRouterBase } from '../../common/FronteggRouterBase';

export function FronteggRouter() {
  const { query } = useRouter();
  const { 'frontegg-router': pathArr, ...queryParams } = query as any;

  return <FronteggRouterBase pathArr={pathArr} queryParams={queryParams} />;
}

export function FronteggRouterProps(context: any) {
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
