import { FronteggApiMiddleware } from '@frontegg/nextjs/middleware';

export default FronteggApiMiddleware;

/**
 *  Option to support multiple origins in single nextjs backend
 *
 *  import type { NextApiRequest, NextApiResponse } from 'next';
 *
 * export default function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
 *   // Add CORS headers after the handler has run
 *   const allowedOrigins = ['http://localapp1.davidantoon.me:3000', 'http://localapp2.davidantoon.me:3000'];
 *   const origin = req.headers.origin ?? '';
 *
 *   if (allowedOrigins.includes(origin)) {
 *     res.setHeader('Access-Control-Allow-Origin', origin);
 *   } else {
 *     res.removeHeader('Access-Control-Allow-Origin');
 *   }
 *
 *   res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
 *   res.setHeader(
 *     'Access-Control-Allow-Headers',
 *     'Content-Type, Authorization, x-frontegg-framework, x-frontegg-sdk, frontegg-source'
 *   );
 *   res.setHeader('Access-Control-Allow-Credentials', 'true');
 *
 *   return FronteggApiMiddleware(req, res);
 * }
 */

export const config = {
  api: {
    externalResolver: true,
    responseLimit: false,
  },
};
