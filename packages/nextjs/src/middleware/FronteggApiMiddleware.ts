import type { NextApiRequest, NextApiResponse } from 'next';
import { FronteggProxy } from './FronteggProxy';
import { fronteggSSOPathRewrite, fronteggPathRewrite, defaultFronteggHeaders } from './constants';
import { isInternalRequest, rewritePath } from './helpers';
import { getSession } from '../pages';
import { CorsOptions, FronteggApiMiddlewareType, FronteggMiddlewareOptions } from './types';
import config from '../config';
import { isFronteggLogoutUrl } from './helpers';
import CookieManager from '../utils/cookies';
import { getTokensFromCookie } from '../common';

const handleCors = (req: NextApiRequest, res: NextApiResponse, corsOptions?: CorsOptions) => {
  if (!corsOptions) return;

  const {
    allowedOrigins = ['*'],
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    allowCredentials = true,
  } = corsOptions;

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
};

const middlewarePromise = (req: NextApiRequest, res: NextApiResponse, options?: FronteggMiddlewareOptions) =>
  new Promise<void>(async (resolve) => {
    const fronteggUrlPath = rewritePath(req.url ?? '/', fronteggPathRewrite);
    const rewriteUrl = rewritePath(fronteggUrlPath ?? '/', fronteggSSOPathRewrite);
    req.url = rewriteUrl;
    res.on('close', () => resolve());
    const proxyOptions = {
      target: process.env['FRONTEGG_BASE_URL'],
    };
    if (process.env['FRONTEGG_TEST_URL'] && req.url == '/frontegg/middleware-test') {
      proxyOptions.target = process.env['FRONTEGG_TEST_URL'];
    }
    const headers: Record<string, string> = {};
    if (process.env['FRONTEGG_SECURE_JWT_ENABLED'] === 'true') {
      const session = await getSession(req);
      if (session?.accessToken) {
        headers['authorization'] = 'Bearer ' + session.accessToken;
      }
    }

    if (config.isHostedLogin && isFronteggLogoutUrl(req.url || '') && !headers['authorization']) {
      const sessionCookie = CookieManager.getSessionCookieFromRequest(req);
      const tokens = await getTokensFromCookie(sessionCookie);
      if (tokens?.accessToken) {
        headers['authorization'] = 'Bearer ' + tokens.accessToken;
      }
    }

    if (options?.getClientIp) {
      config.getClientIp = options.getClientIp;
    }

    handleCors(req, res, options?.cors);

    FronteggProxy.web(req, res, {
      ...proxyOptions,
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

FronteggApiMiddleware.withOptions =
  (options: FronteggMiddlewareOptions) =>
  async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    return await middlewarePromise(req, res, options);
  };

export { FronteggApiMiddleware };
