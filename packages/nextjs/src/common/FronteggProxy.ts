import httpProxy from 'http-proxy';
import { fronteggAuthApiRoutes } from '@frontegg/rest-api';
import { NextApiRequest, NextApiResponse } from 'next';
import Server from 'http-proxy';
import type { ClientRequest, IncomingMessage } from 'http';
import { CookieManager, createSessionFromAccessToken } from './index';
import fronteggConfig from './FronteggConfig';

/**
 * @see https://www.npmjs.com/package/http-proxy
 */
export const FronteggProxy = httpProxy.createProxyServer({
  target: process.env['FRONTEGG_BASE_URL'],
  autoRewrite: false,
  followRedirects: true,
});

const proxyReqCallback: Server.ProxyReqCallback<ClientRequest, NextApiRequest, NextApiResponse> = (proxyReq, req) => {
  try {
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      // in case if content-type is application/x-www-form-urlencoded -> we need to change to application/json
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      // stream the content
      proxyReq.write(bodyData);
    }
  } catch (e) {
    console.error("once('proxyReq'), ERROR", e);
  }
};
/**
 * Set proxy request callback handler
 */
// @ts-ignore
FronteggProxy.on('proxyReq', proxyReqCallback);

const proxyResCallback: Server.ProxyResCallback<IncomingMessage, NextApiResponse> = (proxyRes, req, res) => {
  let buffer = new Buffer('');
  let totalLength: number = 0;
  const isSecured = new URL(fronteggConfig.appUrl).protocol === 'https:';

  proxyRes.on('data', (chunk: Buffer) => {
    totalLength += chunk.length;
    buffer = Buffer.concat([buffer, chunk], totalLength);
  });
  proxyRes.on('end', async () => {
    try {
      const url = req.url!;
      const statusCode = proxyRes.statusCode ?? 500;
      const isSuccess = statusCode >= 200 && statusCode < 300;
      const bodyStr = buffer.toString('utf-8');
      const isLogout = isFronteggLogoutUrl(url);

      if (isLogout) {
        CookieManager.removeCookies({
          isSecured,
          cookieDomain: fronteggConfig.cookieDomain,
          res,
          req,
        });
        res.status(statusCode).end(bodyStr);
        return;
      }

      if (isSuccess) {
        const cookies = CookieManager.modifySetCookie(proxyRes.headers['set-cookie'], isSecured) ?? [];

        try {
          const body = JSON.parse(bodyStr);
          const [session, decodedJwt] = await createSessionFromAccessToken(body);

          if (session) {
            const sessionCookie = CookieManager.createCookie({
              value: session,
              expires: new Date(decodedJwt.exp * 1000),
              isSecured,
            });
            cookies.push(...sessionCookie);
          }
        } catch (e) {
          if (bodyStr !== '') {
            console.error('[ERROR] FronteggMiddleware', 'proxy failed to parse response body', bodyStr, e);
          }
        }
        res.setHeader('set-cookie', cookies);
        res.status(statusCode).end(bodyStr);
      } else {
        console.error('[ERROR] FronteggMiddleware', { url, statusCode, bodyStr });
        res.status(statusCode).end(bodyStr);
      }
    } catch (e: any) {
      console.error('[ERROR] FronteggMiddleware', 'proxy failed to send request', e);
      res.status(500).end('Internal Server Error');
    }
  });
};

/**
 * Set proxy resonse callback handler
 */
// @ts-ignore
FronteggProxy.on('proxyRes', proxyResCallback);

/**
 * If pattern information matching the input url information is found in the `pathRewrite` array,
 * the url value is partially replaced with the `pathRewrite.replaceStr` value.
 * @param url
 * @param pathRewrite
 */
export const rewritePath = (
  url: string,
  pathRewrite: { [key: string]: string } | { patternStr: string; replaceStr: string }[]
) => {
  if (Array.isArray(pathRewrite)) {
    for (const item of pathRewrite) {
      const { patternStr, replaceStr } = item;
      const pattern = RegExp(patternStr);
      if (pattern.test(url as string)) {
        return url.replace(pattern, replaceStr);
      }
    }
  } else {
    // tslint:disable-next-line:forin
    for (const patternStr in pathRewrite) {
      const pattern = RegExp(patternStr);
      const path = pathRewrite[patternStr];
      if (pattern.test(url as string)) {
        return url.replace(pattern, path);
      }
    }
  }
  return url;
};

export const fronteggPathRewrite = [
  {
    patternStr: '^/api/',
    replaceStr: '/',
  },
];

export const isFronteggLogoutUrl = (url: string) => {
  return (
    fronteggAuthApiRoutes.filter((path) => path.endsWith('/logout')).findIndex((route) => url.endsWith(route)) >= 0
  );
};
