/**
 * {@link FronteggRouter} is a React functional component that manages Frontegg's application routing logic.
 * It uses the AppContext and useRouter hooks to retrieve the current application context and router instance.
 * When the component is mounted, checks if the pathname is Frontegg's auth routes.
 * If the pathname is the login URL, and hosted login enabled it will redirect the user to the hostedLogin domain.
 * If the pathname is the logout URL, it invokes the logout function and redirects the user to the logout route.
 *
 * Note that this function is intended to be used in conjunction with the Next.js pages architecture,
 * as it relies on the useRouter hook, which is specific to Next.js. So it should only be used in a Next.js environment,
 * and only in cases where the Frontegg hosted login box is being used.
 *
 * Next.js works with pages (Next.js 12).
 * For Next.js 12: create file under ./pages/[...frontegg-router].tsx.
 *
 * For Next.js 13+ with app directories feature, import from `@frontegg/nextjs/client`
 *
 * and paste the snippet below:
 *
 * ```typescript
 *    import { FronteggRouter, FronteggRouterProps } from '@frontegg/nextjs/pages';
 *
 *    export const getServerSideProps = FronteggRouterProps;
 *    export default FronteggRouter;
 * ```
 */
export { FronteggRouter, FronteggRouterProps } from './FronteggRouter';
