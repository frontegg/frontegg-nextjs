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
