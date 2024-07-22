import { defaultFronteggRoutes } from '../utils/routing';

const staticFilesRegex = new RegExp('^/(_next/static).*');
const imageOptimizationRegex = new RegExp('^/(_next/image).*');
const headerRequestsRegex = new RegExp('^/(favicon.ico).*');
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
export const shouldByPassMiddleware = (pathname: string, options?: ByPassOptions): boolean => {
  const _options = {
    bypassStaticFiles: true,
    bypassImageOptimization: true,
    bypassHeaderRequests: true,
    ...options,
    bypassFronteggMiddleware: true,
    bypassFronteggRoutes: true,
    bypassAuthSamlCallback: true,
  };

  const isStaticFiles = staticFilesRegex.test(pathname);
  const isImageOptimization = imageOptimizationRegex.test(pathname);
  const isHeaderRequests = headerRequestsRegex.test(pathname);
  const isFronteggMiddleware = fronteggMiddlewareRegex.test(pathname);

  const { authenticatedUrl, ...authRoutes } = defaultFronteggRoutes;
  const isFronteggRoutes = Object.values(authRoutes).find((path) => pathname.startsWith(path)) != null;

  if (isStaticFiles) return _options.bypassStaticFiles;
  if (isImageOptimization) return _options.bypassImageOptimization;
  if (isHeaderRequests) return _options.bypassHeaderRequests;
  if (isFronteggMiddleware) return _options.bypassFronteggMiddleware;
  if (isFronteggRoutes) return _options.bypassFronteggRoutes;

  return false;
};
