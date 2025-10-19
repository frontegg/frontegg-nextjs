import { IncomingHttpHeaders } from 'http';
import fronteggLogger from '../../utils/fronteggLogger';

const nextJsFilesRegex = new RegExp('^/(_next/).*');
const headerRequestsRegex = new RegExp('^/(favicon.ico).*');
const willKnownRequestsRegex = new RegExp('^/(.well-known)/.*');

interface ByPassOptions {
  bypassNextJsFiles?: boolean;
  bypassWillKnownRoutes?: boolean; // default: true
  bypassHeaderRequests?: boolean; // default: true
}

/**
 * Use `shouldBypassGetInitialProps` in the withFronteggApp.ts file
 * to protect all application's routes.
 * You can override whitelist by passing options parameter
 * NOTE: this will slow down your application due to session check on each
 * static files and image request
 */
export const shouldBypassGetInitialProps = (
  pathname: string,
  headers?: IncomingHttpHeaders,
  options?: ByPassOptions
): boolean => {
  const logger = fronteggLogger.child({ tag: 'shouldBypassGetInitialProps' });
  const _options = {
    bypassNextJsFiles: true,
    bypassHeaderRequests: true,
    bypassWillKnownRoutes: true,
    ...options,
  };

  const isNextJsFiles = nextJsFilesRegex.test(pathname);
  const isHeaderRequests = headerRequestsRegex.test(pathname);
  const isWillKnownRoutes = willKnownRequestsRegex.test(pathname);

  logger.debug(`${pathname}`, { options, checks: { isNextJsFiles, isHeaderRequests, isWillKnownRoutes } });

  if (isNextJsFiles) return _options.bypassNextJsFiles;
  if (isHeaderRequests) return _options.bypassHeaderRequests;
  if (isWillKnownRoutes) return _options.bypassWillKnownRoutes;

  if (!headers) {
    return false;
  }
  const isPrefetchRequest = headers['next-router-prefetch'] || headers.purpose === 'prefetch';
  const secFetchModeHeader = headers['sec-fetch-mode'];
  const secFetchDestHeader = headers['sec-fetch-dest'];

  const isBrowserAddressBarPrefetch =
    isPrefetchRequest && secFetchModeHeader === 'navigate' && secFetchDestHeader === 'document';

  // noinspection RedundantIfStatementJS
  if (isPrefetchRequest && !isBrowserAddressBarPrefetch) {
    return true;
  }

  return false;
};
