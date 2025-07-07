import NextJsPkg from 'next/package.json';
import { ProxyReqCallback } from 'http-proxy';
import { ClientRequest } from 'http';
import { NextApiRequest } from 'next';
import sdkVersion from '../sdkVersion';
import config from '../config';
import CookieManager from '../utils/cookies';
import fronteggLogger from '../utils/fronteggLogger';
import {
  FRONTEGG_HEADERS_VERIFIER_HEADER,
  FRONTEGG_FORWARD_IP_HEADER,
  getClientIp,
  FRONTEGG_VENDOR_ID_HEADER,
} from '../api/utils';
import { headersToRemove } from './constants';

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
    let modifiedCookies = ``;

    fronteggCookiesNames.forEach((requestCookieName: string) => {
      let cookieName = requestCookieName;
      if (config.rewriteCookieByAppId && config.appId) {
        cookieName = requestCookieName
          .replace(config.appId, config.clientId)
          .replace(config.appId.replace(/-/g, ''), config.clientId.replace(/-/g, ''))
          .replace(config.appId.replace('-', ''), config.clientId.replace('-', ''));

        logger.debug(`cookieName ${requestCookieName} replaced with appId ${cookieName}`);
      }

      logger.debug(`PROXY_ADDING_COOKIE ${cookieName}, ${allCookies[requestCookieName]}`);
      modifiedCookies += `${cookieName}=${allCookies[requestCookieName]}; `;
    });
    proxyReq.setHeader('cookie', modifiedCookies);

    proxyReq.setHeader('x-frontegg-framework', req.headers['x-frontegg-framework'] ?? `next@${NextJsPkg.version}`);
    proxyReq.setHeader('x-frontegg-sdk', req.headers['x-frontegg-sdk'] ?? `@frontegg/nextjs@${sdkVersion.version}`);
    proxyReq.setHeader('x-frontegg-middleware', 'true');

    /**
     * Request uncompressed responses to avoid handling compression in middleware.
     * This ensures consistent behavior across different environments and simplifies response processing.
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
     */
    proxyReq.setHeader('Accept-Encoding', 'identity');

    let clientIp: string | undefined;

    // if (config.isVercel) {
    //   clientIp = getClientIp(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']);
    // } else if (config.getClientIp) {
    //   clientIp = config.getClientIp(req);
    // }

    if (config.getClientIp) {
      console.log('config.getClientIp(req)', config.getClientIp(req));
      clientIp = config.getClientIp(req);
    }

    if (clientIp && config.shouldForwardIp) {
      proxyReq.setHeader(FRONTEGG_FORWARD_IP_HEADER, clientIp);
      proxyReq.setHeader(FRONTEGG_HEADERS_VERIFIER_HEADER, config.sharedSecret ?? '');
      proxyReq.setHeader(FRONTEGG_VENDOR_ID_HEADER, config.clientId);
    }

    headersToRemove.map((header) => proxyReq.removeHeader(header));

    logger.debug(`${req.url} | check if request has body`);
    if (req.method !== 'GET' && req.body) {
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
