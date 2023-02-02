import httpProxy from 'http-proxy';
import { fronteggAuthApiRoutes } from '@frontegg/rest-api';
import { NextApiRequest, NextApiResponse } from 'next';
import Server from 'http-proxy';
import type { ClientRequest, IncomingMessage } from 'http';
import { CookieManager, createSessionFromAccessToken } from './index';
import fronteggConfig from './FronteggConfig';
import cookie from 'cookie';

/**
 * @see https://www.npmjs.com/package/http-proxy
 */
export const FronteggProxy = httpProxy.createProxyServer({
  target: process.env['FRONTEGG_BASE_URL'],
  changeOrigin: true,
  selfHandleResponse: true,
});

const proxyReqCallback: Server.ProxyReqCallback<ClientRequest, NextApiRequest, NextApiResponse> = (proxyReq, req) => {
  try {
    const cookies = cookie.parse(req.headers['cookie'] ?? '');
    Object.keys(cookies)
      .filter((cookieName) => cookieName.startsWith('fe_') && !cookieName.startsWith(fronteggConfig.cookieName))
      .forEach((cookieName) => {
        proxyReq.setHeader(cookieName, cookies[cookieName]);
      });

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
      const isSuccess = statusCode >= 200 && statusCode < 400;
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
          if (body.accessToken && body.access_token) {
            const [session, decodedJwt] = await createSessionFromAccessToken(body);

            if (session) {
              const sessionCookie = CookieManager.createCookie({
                value: session,
                expires: new Date(decodedJwt.exp * 1000),
                isSecured,
              });
              cookies.push(...sessionCookie);
            }
          }
        } catch (e) {
          /** ignore api call if:
           * - Does not have accessToken / access_token
           * - Not json response
           */
        }
        Object.keys(proxyRes.headers)
          .filter((header) => header !== 'cookie')
          .forEach((header) => {
            res.setHeader(header, `${proxyRes.headers[header]}`);
          });
        res.setHeader('set-cookie', cookies);
        res.status(statusCode).end(bodyStr);
      } else {
        if (statusCode >= 400) {
          console.error('[ERROR] FronteggMiddleware', { url, statusCode });
        }
        Object.keys(proxyRes.headers)
          .filter((header) => header !== 'cookie')
          .forEach((header) => {
            res.setHeader(header, `${proxyRes.headers[header]}`);
          });
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
export const fronteggSSOPathRewrite = [
  {
    patternStr: '/frontegg/saml/callback$',
    replaceStr: '/auth/saml/callback',
  },
];

export const isFronteggLogoutUrl = (url: string) => {
  return (
    fronteggAuthApiRoutes.filter((path) => path.endsWith('/logout')).findIndex((route) => url.endsWith(route)) >= 0
  );
};
