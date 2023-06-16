import NextJsPkg from 'next/package.json';
import { ProxyReqCallback } from 'http-proxy';
import { ClientRequest } from 'http';
import { NextApiRequest } from 'next';
import sdkVersion from '../sdkVersion';
import config from '../config';
import CookieManager from '../utils/cookies';
import fronteggLogger from '../utils/fronteggLogger';

const logger = fronteggLogger.child({ tag: 'FronteggApiMiddleware.ProxyRequestCallback' });
/**
 * Proxy request callback fired on before each request to Frontegg services,
 * to transport frontegg cookies.
 *
 * @param {ClientRequest} proxyReq - Proxy request to be sent
 * @param {NextApiRequest} req - Next.js incoming request
 */
const ProxyRequestCallback: ProxyReqCallback<ClientRequest, NextApiRequest> = (proxyReq, req) => {
  try {
    logger.info(`${req.url} | Going to proxy request`);
    logger.debug(`${req.url} | parsing request cookies`);
    const allCookies = CookieManager.parseCookieHeader(req);
    logger.debug(`${req.url} | found ${allCookies} cookies`);
    const fronteggCookiesNames = Object.keys(allCookies).filter((cookieName) => {
      return cookieName.startsWith('fe_') && !cookieName.startsWith(config.cookieName);
    });

    logger.debug(`${req.url} | proxy FronteggCookies (${fronteggCookiesNames.join(', ')})`);
    fronteggCookiesNames.forEach((cookieName: string) => {
      proxyReq.setHeader(cookieName, allCookies[cookieName]);
    });

    proxyReq.setHeader('x-frontegg-framework', req.headers['x-frontegg-framework'] ?? `next@${NextJsPkg.version}`);
    proxyReq.setHeader('x-frontegg-sdk', req.headers['x-frontegg-sdk'] ?? `@frontegg/nextjs@${sdkVersion.version}`);
    proxyReq.setHeader('x-frontegg-middleware', 'true');
    proxyReq.setHeader('accept-encoding', 'gzip, deflate, br');

    [
      'x-invoke-path',
      'x-invoke-query',
      'x-middleware-invoke',
      'x-middleware-next',
      'x-forwarded-for',
      'x-forwarded-host',
      'x-forwarded-port',
      'x-forwarded-proto',
      'transfer-encoding',
      'cache-control',
    ].map((header) => proxyReq.removeHeader(header));

    logger.debug(`${req.url} | check if request has body`);
    if (req.body) {
      logger.debug(`${req.url} | writing request body to proxyReq`);
      const bodyData = JSON.stringify(req.body);
      // in case if content-type is application/x-www-form-urlencoded -> we need to change to application/json
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      // stream the content
      proxyReq.write(bodyData);
    }
  } catch (e) {
    logger.error(`${req.url} | Failed to proxy request`, e);
  }
};

export default ProxyRequestCallback;
