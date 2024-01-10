import { createProxyServer } from 'http-proxy';
import ProxyRequestCallback from './ProxyRequestCallback';
import ProxyResponseCallback from './ProxyResponseCallback';

/**
 * @see https://www.npmjs.com/package/http-proxy
 */
export const FronteggProxy = createProxyServer({
  target: process.env['FRONTEGG_BASE_URL'],
  changeOrigin: true,
  selfHandleResponse: true,
  /**
   * We set xfwd to true to avoid next-js buggy implementation of x-forwarded-* headers in version 14.0.2
   * They set the x-forwarded-port header to be 'undefined' in production environment - https://github.com/vercel/next.js/issues/58295
   * This causes our proxy middleware to fail on every request
   */
  xfwd: true,
});

/**
 * Set proxy request callback handler
 */
// @ts-ignore
FronteggProxy.on('proxyReq', ProxyRequestCallback);
/**
 * Set proxy response callback handler
 */
// @ts-ignore
FronteggProxy.on('proxyRes', ProxyResponseCallback);
