import { notFound } from 'next/navigation';
import { ParsedUrlQuery } from 'querystring';
import { isAuthRoute } from '../utils/routing';
import { FronteggRouterBase } from '../common/FronteggRouterBase';
import React from 'react';

interface FronteggRouterProps {
  params: ParsedUrlQuery & { 'frontegg-router'?: string[] };
  searchParams?: ParsedUrlQuery;
}

export function FronteggAppRouter({ params: { 'frontegg-router': pathArr = [] }, searchParams }: FronteggRouterProps) {
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

  return <FronteggRouterBase pathArr={pathArr} queryParams={searchParams} />;
}
