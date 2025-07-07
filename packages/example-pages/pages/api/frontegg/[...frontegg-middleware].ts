import { FronteggApiMiddleware } from '@frontegg/nextjs/middleware';

export default FronteggApiMiddleware;

/**
 *  Option to support multiple origins in single nextjs backend
 *
 * export default FronteggApiMiddleware.withOptions({
 * cors: {
 *   allowedOrigins: ['http://localapp1.davidantoon.me:3000', 'http://localapp2.davidantoon.me:3000'],
 *   allowCredentials: true,
 *   allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
 * }
 * });
 *
 */

/**
 *  Option to provide client ip
 *
 * export default FronteggApiMiddleware.withOptions({
 * getClientIp: (req) => req.headers['x-your-custom-ip-header']?.toString(),
 * });
 *
 */

export const config = {
  api: {
    externalResolver: true,
    responseLimit: false,
  },
};
