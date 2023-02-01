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
    FronteggProxy.web(req, res, {
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
