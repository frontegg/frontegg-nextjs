import { FronteggApiMiddleware } from '@frontegg/nextjs/middleware';

export default FronteggApiMiddleware;

/**
 *  Option to support multiple origins in single nextjs backend
 *
 * export default FronteggApiMiddleware.cors({
 *   allowedOrigins: ['http://localapp1.davidantoon.me:3000', 'http://localapp2.davidantoon.me:3000'],
 *   allowCredentials: true,
 *   allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
 * });
 *
 */

export const config = {
  api: {
    externalResolver: true,
    responseLimit: false,
  },
};
