/**
 * {@link FronteggAppRouter} is a routing fallback to handle routing events in order to
 * dynamically inject Frontegg authentication routes.
 *
 * Next.js works with pages (Next.js 12) and app directories (Next.js 13+).
 * For Next.js 12: create file under ./pages/[...frontegg-router].tsx.
 * For Next.js 13: create a new file `./app/[...frontegg-router]/page.tsx`
 *
 * and paste the snippet below:
 *
 * ```typescript
 *    import { FronteggAppRouter, FronteggAppRouterProps } from '@frontegg/nextjs/pages';
 *
 *    export const getServerSideProps = FronteggAppRouterProps;
 *    export default FronteggAppRouter;
 * ```
 */
export { FronteggAppRouter, FronteggAppRouterProps } from './FronteggAppRouter';
