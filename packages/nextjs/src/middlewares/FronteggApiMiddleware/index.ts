/**
 * {@link FronteggApiMiddleware} is a proxy between the Client-Side to Frontegg gateway.
 * The purpose of this middleware is to handle auth response before arrived to the Client-Side
 * for extracting JWT and fe_* headers to create NextJS session cookie.
 *
 * NextJS session cookies used for getServerSideProps in client-components and ServerComponents.
 *
 * Usage:
 *
 * Create new file under `./pages/api/frontegg/[...frontegg-middleware].ts` and paste the snippet below:
 *
 * ```typescript
 *    export { FronteggApiMiddleware as default } from '@frontegg/nextjs/middlewares';
 *
 *    export const config = {
 *      api: {
 *        externalResolver: true,
 *        responseLimit: true,
 *      },
 *    };
 * ```
 */
export { FronteggApiMiddleware } from './FronteggApiMiddleware';
