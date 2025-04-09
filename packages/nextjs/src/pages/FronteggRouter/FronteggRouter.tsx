import React from 'react';
import URL from 'url';
import { useRouter } from 'next/router';
import { defaultFronteggRoutes, getAuthRoutes, isAuthRoute } from '../../utils/routing';
import { FronteggRouterBase } from '../../common/FronteggRouterBase';

export function FronteggRouter() {
  const { query, route } = useRouter();
  const { 'frontegg-router': pathArr = [], ...queryParams } = query as any;

  return <FronteggRouterBase pathArr={pathArr ?? [route.substring(1)]} queryParams={queryParams} />;
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

export function FronteggStaticRouterProps() {
  return {
    props: {},
  };
}

export function FronteggStaticPaths() {
  const { routesArr } = getAuthRoutes();
  const filteredRoutes = routesArr.filter((route) => route !== defaultFronteggRoutes.authenticatedUrl);

  return {
    paths: filteredRoutes,
    fallback: true,
  };
}
