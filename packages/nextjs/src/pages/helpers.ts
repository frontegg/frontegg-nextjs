import { defaultFronteggRoutes } from '../utils/routing';
import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import type { ParsedUrlQuery } from 'querystring';
import type { FronteggNextJSSession, RequestType } from '../types';
import config from '../config';
import CookieManager from '../utils/cookies';
import createSession from '../utils/createSession';
import encryption from '../utils/encryption';

export const getSession = (req: RequestType) => {
  const cookies = CookieManager.getSessionCookieFromRequest(req);
  return createSession(cookies, encryption);
};

export function withSSRSession<
  P extends { [key: string]: any } = { [key: string]: any },
  Q extends ParsedUrlQuery = ParsedUrlQuery
>(
  handler: (
    context: GetServerSidePropsContext<Q>,
    session: FronteggNextJSSession
  ) => GetServerSidePropsResult<P> | Promise<GetServerSidePropsResult<P>>
) {
  return async (context: GetServerSidePropsContext<Q>): Promise<GetServerSidePropsResult<P>> => {
    const session = await getSession(context.req);
    if (session) {
      return handler(context, session);
    } else {
      let loginUrl = config.authRoutes.loginUrl ?? defaultFronteggRoutes.logoutUrl;

      if (!loginUrl.startsWith('/')) {
        loginUrl = `/${loginUrl}`;
      }

      const fullUrl = new URL(config.appUrl + context.resolvedUrl);
      const urlSearchParams = fullUrl.searchParams;
      urlSearchParams.set('redirectUrl', context.resolvedUrl ?? context.req.url);

      return {
        redirect: {
          permanent: false,
          destination: `${loginUrl}?${urlSearchParams.toString()}`,
        },
        props: {},
      } as GetServerSidePropsResult<P>;
    }
  };
}
