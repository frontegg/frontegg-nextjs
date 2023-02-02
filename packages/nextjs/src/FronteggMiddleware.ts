import type { NextApiRequest, NextApiResponse } from 'next';
import { fronteggPathRewrite, FronteggProxy, rewritePath } from './common/FronteggProxy';

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
 * @param {NextApiRequest} req
 * @param {NextApiResponse} res
 */
export async function fronteggMiddleware(req: NextApiRequest, res: NextApiResponse) {
  return await middlewarePromise(req, res);
}
