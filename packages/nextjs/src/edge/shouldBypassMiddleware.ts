import type { NextRequest } from 'next/server';

import { defaultFronteggRoutes } from '../utils/routing';

const staticFilesRegex = new RegExp('^/(_next/static).*');
const imageOptimizationRegex = new RegExp('^/(_next/image).*');
const headerRequestsRegex = new RegExp('^/(favicon.ico).*');
const willKnownRequestsRegex = new RegExp('^/(.well-known)/.*');
const fronteggMiddlewareRegex = new RegExp('^/(api/frontegg).*');

interface ByPassOptions {
  bypassStaticFiles?: boolean; // default: true
  bypassImageOptimization?: boolean; // default: true
  bypassHeaderRequests?: boolean; // default: true
}

/**
 * Use `shouldByPassMiddleware` in the middleware.ts file
 * to protect all application's routes.
 * You can override whitelist by passing options parameter
 * NOTE: this will slow down your application due to session check on each
 * static files and image request
 *
 * The default whitelist:
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * - favicon.ico (favicon file)
 * - api/frontegg (API frontegg middleware)
 * - account/[login|logout|saml/callback|...] (frontegg authentication routes)
 */
export const shouldByPassMiddleware = (
  pathname: string,
  headers: NextRequest['headers'],
  options?: ByPassOptions
): boolean => {
  const _options = {
    bypassStaticFiles: true,
    bypassImageOptimization: true,
    bypassHeaderRequests: true,
    bypassWillKnownRoutes: true,
    ...options,
    bypassFronteggMiddleware: true,
    bypassFronteggRoutes: true,
    bypassAuthSamlCallback: true,
  };

  const isStaticFiles = staticFilesRegex.test(pathname);
  const isImageOptimization = imageOptimizationRegex.test(pathname);
  const isHeaderRequests = headerRequestsRegex.test(pathname);
  const isWillKnownRoutes = willKnownRequestsRegex.test(pathname);
  const isFronteggMiddleware = fronteggMiddlewareRegex.test(pathname);

  const { authenticatedUrl, ...authRoutes } = defaultFronteggRoutes;
  const isFronteggRoutes = Object.values(authRoutes).find((path) => pathname.startsWith(path)) != null;

  if (isStaticFiles) return _options.bypassStaticFiles;
  if (isImageOptimization) return _options.bypassImageOptimization;
  if (isHeaderRequests) return _options.bypassHeaderRequests;
  if (isFronteggMiddleware) return _options.bypassFronteggMiddleware;
  if (isWillKnownRoutes) return _options.bypassWillKnownRoutes;
  if (isFronteggRoutes) return _options.bypassFronteggRoutes;

  const isPrefetchRequest = headers.has('next-router-prefetch') || headers.get('purpose') === 'prefetch';
  const secFetchModeHeader = headers.get('sec-fetch-mode');
  const secFetchDestHeader = headers.get('sec-fetch-dest');

  const isBrowserAddressBarPrefetch =
    isPrefetchRequest && secFetchModeHeader === 'navigate' && secFetchDestHeader === 'document';

  // noinspection RedundantIfStatementJS
  if (isPrefetchRequest && !isBrowserAddressBarPrefetch) {
    /* bypass prefetch requests on hovering links that leads to SSG pages */
    return true;
  }

  return false;
};
