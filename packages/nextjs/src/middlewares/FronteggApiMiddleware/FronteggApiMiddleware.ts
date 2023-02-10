import type { NextApiRequest, NextApiResponse } from 'next';
import { FronteggProxy } from './FronteggProxy';
import { fronteggSSOPathRewrite, fronteggPathRewrite } from './constants';
import { rewritePath } from './helpers';

const middlewarePromise = (req: NextApiRequest, res: NextApiResponse) =>
  new Promise<void>((resolve) => {
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
    FronteggProxy.web(req, res, options);
  });

/**
 * Next.js HTTP Proxy Middleware
 * @see https://nextjs.org/docs/api-routes/api-middlewares
 * @param {NextApiRequest} req - NextJS api request passed from api routing
 * @param {NextApiResponse} res - NextJS api response passed from api routing
 */
export async function FronteggApiMiddleware(req: NextApiRequest, res: NextApiResponse) {
  return await middlewarePromise(req, res);
}
