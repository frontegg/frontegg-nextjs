import { authInitialState } from '@frontegg/redux-store';
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { ParsedUrlQuery } from 'querystring';
import type { FronteggNextJSSession, RequestType } from './types';
import config from './config';
import CookieManager from './utils/cookies';
import createSession from './utils/createSession';
import encryption from './utils/encryption';

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
      debugger;
      return handler(context, session);
    } else {
      let loginUrl = config.authRoutes.loginUrl ?? authInitialState.routes.loginUrl;

      if (!loginUrl.startsWith('/')) {
        loginUrl = `/${loginUrl}`;
      }
      debugger;
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
