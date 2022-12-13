import { authInitialState } from '@frontegg/redux-store';
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { FronteggNextJSSession, getCookieFromRequest, getSessionFromCookie, RequestType } from './common';
import fronteggConfig from './common/FronteggConfig';

export async function getSession(req: RequestType): Promise<FronteggNextJSSession | undefined> {
  try {
    const sealFromCookies = getCookieFromRequest(req);
    return getSessionFromCookie(sealFromCookies);
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

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
      let loginUrl = fronteggConfig.authRoutes.loginUrl ?? authInitialState.routes.loginUrl;

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
