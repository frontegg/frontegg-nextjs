import { authInitialState } from '@frontegg/redux-store';
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { ParsedUrlQuery } from 'querystring';
import type { FronteggNextJSSession, RequestType } from './common';
import { getTokensFromCookie, createGetSession } from './common';
import ConfigManager from './ConfigManager';
import CookieManager from './CookieManager';

export const getSession = (req: RequestType) =>
  createGetSession({
    getCookie: () => CookieManager.getSessionCookieFromRequest(req),
    cookieResolver: getTokensFromCookie,
  });

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
      let loginUrl = ConfigManager.authRoutes.loginUrl ?? authInitialState.routes.loginUrl;

      if (!loginUrl.startsWith('/')) {
        loginUrl = `/${loginUrl}`;
      }
      return {
        redirect: {
          permanent: false,
          destination: `${loginUrl}?redirectUrl=${encodeURIComponent(context.resolvedUrl ?? context.req.url)}`,
        },
        props: {},
      } as GetServerSidePropsResult<P>;
    }
  };
}
