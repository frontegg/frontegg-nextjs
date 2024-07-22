import { ProxyResCallback } from 'http-proxy';
import { IncomingMessage } from 'http';
import { NextApiResponse } from 'next';
import config from '../config';
import CookieManager from '../utils/cookies';
import { createSessionFromAccessToken } from '../common';
import {
  extractAccessToken,
  getHostedLogoutUrl,
  isFronteggLogoutUrl,
  isFronteggOauthLogoutUrl,
  removeJwtSignatureFrom,
} from './helpers';
import fronteggLogger from '../utils/fronteggLogger';
import { isSSOPostRequest } from '../utils/refreshAccessTokenIfNeeded/helpers';

const logger = fronteggLogger.child({ tag: 'FronteggApiMiddleware.ProxyResponseCallback' });
/**
 * Proxy response callback fired on after each response from Frontegg services,
 * to transport frontegg modify cookies and generating encrypted JWT session cookie.
 *
 * @param {IncomingMessage} proxyRes - Proxy response from Frontegg services
 * @param {NextApiRequest} req - Next.js request sent from client-side
 * @param {NextApiResponse} res - Next.js response to send to client-side
 */
const ProxyResponseCallback: ProxyResCallback<IncomingMessage, NextApiResponse> = (proxyRes, req, res) => {
  let buffer = new Buffer('');
  let totalLength: number = 0;
  const isSecured = new URL(config.appUrl).protocol === 'https:';

  proxyRes.on('data', (chunk: Buffer) => {
    totalLength += chunk.length;
    buffer = Buffer.concat([buffer, chunk], totalLength);
  });
  proxyRes.on('end', async () => {
    try {
      const url = req.url!;
      const statusCode = proxyRes.statusCode ?? 500;
      const isSuccess = statusCode >= 200 && statusCode < 400;
      let bodyStr = buffer.toString('utf-8');
      const isLogout = isFronteggLogoutUrl(url);

      if (isLogout) {
        CookieManager.removeCookies({
          isSecured,
          cookieDomain: config.cookieDomain,
          res,
          req,
        });
        if (isFronteggOauthLogoutUrl(url) || config.isHostedLogin) {
          const { asPath: hostedLogoutUrl } = getHostedLogoutUrl(req.headers['referer']);
          res.status(302).end(hostedLogoutUrl);
          return;
        }
        res.status(statusCode).end(bodyStr);
        return;
      }

      const cookies = CookieManager.modifySetCookie(proxyRes.headers['set-cookie'], isSecured) ?? [];
      if (isSuccess) {
        try {
          if (bodyStr && bodyStr.length > 0) {
            const tokens = extractAccessToken(bodyStr);

            if (tokens.accessToken) {
              if (process.env['FRONTEGG_SECURE_JWT_ENABLED'] === 'true') {
                bodyStr = JSON.stringify(removeJwtSignatureFrom(JSON.parse(bodyStr)));
              }

              const [session, decodedJwt] = await createSessionFromAccessToken(tokens);
              if (session) {
                const sessionCookie = CookieManager.create({
                  value: session,
                  expires: new Date(decodedJwt.exp * 1000),
                  secure: isSecured,
                  req,
                });
                cookies.push(...sessionCookie);
              }
            }
          }
        } catch (e) {
          /** ignore api call if:
           * - Does not have accessToken / access_token
           * - Not json response
           */
          if (statusCode === 302 && isSSOPostRequest(url)) {
            /**
             * Ignore saml/oidc postLogin response with redirect
             */
          } else {
            logger.error('failed to create session', e, {
              url,
              statusCode,
            });
          }
        }
        Object.keys(proxyRes.headers)
          .filter((header) => header !== 'cookie')
          .forEach((header) => {
            res.setHeader(header, `${proxyRes.headers[header]}`);
          });
        res.setHeader('set-cookie', cookies);
        res.setHeader('content-length', bodyStr.length);
        res.status(statusCode).end(bodyStr);
      } else {
        if (statusCode >= 400 && statusCode !== 404) {
          logger.error(`Middleware request failed statusCode: ${statusCode} for url: ${url}`);
        }
        Object.keys(proxyRes.headers)
          .filter((header) => header !== 'cookie')
          .forEach((header) => {
            res.setHeader(header, `${proxyRes.headers[header]}`);
          });
        res.setHeader('set-cookie', cookies);
        res.status(statusCode).end(bodyStr);
      }
    } catch (e: any) {
      logger.error('proxy failed to send request', e);
      res.status(500).end('Internal Server Error');
    }
  });
};

export default ProxyResponseCallback;
