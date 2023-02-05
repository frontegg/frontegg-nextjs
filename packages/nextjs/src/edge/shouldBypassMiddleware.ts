interface ByPassOptions {
  bypassStaticFiles?: boolean; // default: true
  bypassImageOptimization?: boolean; // default: false
  bypassHeaderRequests?: boolean; // default: true
}

const staticFilesRegex = new RegExp('^/(_next/static).*');
const imageOptimizationRegex = new RegExp('^/(_next/image).*');
const headerRequestsRegex = new RegExp('^/(favicon.ico).*');
const fronteggMiddlewareRegex = new RegExp('^/(api/frontegg).*');
const fronteggRoutesRegex = new RegExp('^/(account/|oauth/callback).*');

export const shouldByPassMiddleware = (pathname: string, options?: ByPassOptions): boolean => {
  /*
   * Match all request paths except for the ones starting with:
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * - api/frontegg (API frontegg middleware)
   * - account/[login|logout|saml/callback|...] (frontegg authentication routes)
   */

  const _options = {
    bypassStaticFiles: true,
    bypassImageOptimization: true,
    bypassHeaderRequests: true,
    ...options,
    bypassFronteggMiddleware: true,
    bypassFronteggRoutes: true,
  };

  const isStaticFiles = staticFilesRegex.test(pathname);
  const isImageOptimization = imageOptimizationRegex.test(pathname);
  const isHeaderRequests = headerRequestsRegex.test(pathname);
  const isFronteggMiddleware = fronteggMiddlewareRegex.test(pathname);
  const isFronteggRoutes = fronteggRoutesRegex.test(pathname);

  if (isStaticFiles) return _options.bypassStaticFiles;
  if (isImageOptimization) return _options.bypassImageOptimization;
  if (isHeaderRequests) return _options.bypassHeaderRequests;
  if (isFronteggMiddleware) return _options.bypassFronteggMiddleware;
  if (isFronteggRoutes) return _options.bypassFronteggRoutes;

  return false;
};
