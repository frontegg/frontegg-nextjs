import type { NextApiRequest, NextApiResponse } from 'next';
import { FronteggProxy } from './FronteggProxy';
import { fronteggSSOPathRewrite, fronteggPathRewrite, defaultFronteggHeaders } from './constants';
import { isInternalRequest, rewritePath } from './helpers';
import { getSession } from '../pages';
import { CorsOptions, FronteggApiMiddlewareType } from './types';

const middlewarePromise = (req: NextApiRequest, res: NextApiResponse) =>
  new Promise<void>(async (resolve) => {
    const fronteggUrlPath = rewritePath(req.url ?? '/', fronteggPathRewrite);
    const rewriteUrl = rewritePath(fronteggUrlPath ?? '/', fronteggSSOPathRewrite);
    req.url = rewriteUrl;
    res.on('close', () => resolve());
    const options = {
      target: process.env['FRONTEGG_BASE_URL'],
    };
    if (process.env['FRONTEGG_TEST_URL'] && req.url == '/frontegg/middleware-test') {
      options.target = process.env['FRONTEGG_TEST_URL'];
    }

    const headers: Record<string, string> = {};
    if (process.env['FRONTEGG_SECURE_JWT_ENABLED'] === 'true') {
      const session = await getSession(req);
      if (session?.accessToken) {
        headers['authorization'] = 'Bearer ' + session.accessToken;
      }
    }
    FronteggProxy.web(req, res, {
      ...options,
      headers,
    });
  });

/**
 * Next.js HTTP Proxy Middleware
 * @see https://nextjs.org/docs/api-routes/api-middlewares
 * @param {NextApiRequest} req - NextJS api request passed from api routing
 * @param {NextApiResponse} res - NextJS api response passed from api routing
 */
const FronteggApiMiddleware: FronteggApiMiddlewareType = (async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  return await middlewarePromise(req, res);
}) as FronteggApiMiddlewareType;

FronteggApiMiddleware.cors =
  (options: CorsOptions) =>
  async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const {
      allowedOrigins = ['*'],
      allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders = ['Content-Type', 'Authorization'],
      allowCredentials = true,
    } = options;

    if (isInternalRequest(req.headers.host ?? '')) {
      const origin = req.headers.origin ?? '';
      const combinedHeaders = Array.from(new Set([...defaultFronteggHeaders, ...allowedHeaders]));

      if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        res.removeHeader('Access-Control-Allow-Origin');
      }

      res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(','));
      res.setHeader('Access-Control-Allow-Headers', combinedHeaders.join(','));
      res.setHeader('Access-Control-Allow-Credentials', allowCredentials ? 'true' : 'false');
    }

    return middlewarePromise(req, res);
  };

export { FronteggApiMiddleware };
