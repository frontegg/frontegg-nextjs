import type { NextApiRequest, NextApiResponse } from 'next';
import fronteggConfig from './common/FronteggConfig';
import { createSessionFromAccessToken, CookieManager } from './common';
import { fronteggPathRewrite, FronteggProxy, isFronteggLogoutUrl, rewritePath } from './common/FronteggProxy';

export const config = {
  api: {
    externalResolver: true,
    bodyParser: false,
    responseLimit: false,
  },
};

const middlewarePromise = (req: NextApiRequest, res: NextApiResponse) =>
  new Promise<void>((resolve) => {
    req.url = rewritePath(req.url ?? '/', fronteggPathRewrite);
    // console.log('FronteggMiddleware.start', { url: req.url });

    const isSecured = new URL(fronteggConfig.appUrl).protocol === 'https:';

    FronteggProxy.once('proxyReq', (proxyReq: any, req: any) => {
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
    })
      .once('proxyRes', (proxyRes, req) => {
        let buffer = new Buffer('');
        let totalLength: number = 0;
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
              resolve();
              return;
            }

            if (isSuccess) {
              const body = JSON.parse(bodyStr);

              // console.log("FronteggMiddleware.proxyRes", "creating session from access Token")
              const [session, decodedJwt] = await createSessionFromAccessToken(body);

              const cookies = CookieManager.modifySetCookie(proxyRes.headers['set-cookie'], isSecured) ?? [];

              if (session) {
                const sessionCookie = CookieManager.createCookie({
                  value: session,
                  expires: new Date(decodedJwt.exp * 1000),
                  isSecured,
                });
                cookies.push(...sessionCookie);
              }
              res.setHeader('set-cookie', cookies);
              res.status(statusCode).end(bodyStr);
            } else {
              console.error('[ERROR] FronteggMiddleware', { url, statusCode, bodyStr });
              res.status(statusCode).send(bodyStr);
            }
            resolve();
          } catch (e: any) {
            console.error('[ERROR] FronteggMiddleware', 'proxy failed to send request', e);
            res.status(500).end(JSON.stringify({ message: e.message }));
            resolve();
          }
        });
      })
      .web(req, res, {
        changeOrigin: true,
        selfHandleResponse: true,
      });
  });

/**
 * Next.js HTTP Proxy Middleware
 * @see https://nextjs.org/docs/api-routes/api-middlewares
 * @param {NextApiRequest} req
 * @param {NextApiResponse} res
 */
export async function fronteggMiddleware(req: NextApiRequest, res: NextApiResponse) {
  return await middlewarePromise(req, res);
}
