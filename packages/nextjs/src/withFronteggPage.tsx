import deepmerge from 'deepmerge';
import { ILoginResponse } from '@frontegg/rest-api';
import { FronteggStoreContext } from '@frontegg/react-hooks';
import { authActions, authInitialState } from '@frontegg/redux-store';
import type { NextComponentType, NextPageContext } from 'next/dist/shared/lib/utils';
import { FunctionComponent, useContext } from 'react';
import { FronteggConfig, fronteggErrors, getAllUserData } from './common';
import { refreshToken } from './refreshToken';
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { getSession } from './session';
import { IncomingMessage } from 'http';

export const withFronteggPage = <T extends { usedSSR: boolean; user: ILoginResponse; pageProps: any }>(
  page: NextComponentType
) => {
  const originalGetInitialProps = page.getInitialProps;

  if (originalGetInitialProps) {
    page.getInitialProps = page.getInitialProps = async (ctx: NextPageContext): Promise<T> => {
      const originalGetInitialPropsValue = (originalGetInitialProps
        ? await originalGetInitialProps(ctx)
        : { pageProps: {} }) as T;

      if (ctx.req) {
        const { user, tenants, session } = await getAllUserData({
          getSession: async () => await refreshToken(ctx),
          reqHeaders: ctx.req?.headers,
        });

        const { envAppUrl, envBaseUrl, envClientId } = FronteggConfig.appEnvConfig;
        if (!envAppUrl) {
          throw Error(fronteggErrors.envAppUrl);
        }
        if (!envBaseUrl) {
          throw Error(fronteggErrors.envBaseUrl);
        }
        if (!envClientId) {
          throw Error(fronteggErrors.envClientId);
        }
        return {
          ...originalGetInitialPropsValue,
          usedSSR: true,
          pageProps: {
            ...originalGetInitialPropsValue.pageProps,
            session,
            user,
            tenants,
            envAppUrl,
            envBaseUrl: process.env['FRONTEGG_BASE_URL'],
            envClientId: process.env['FRONTEGG_CLIENT_ID'],
          },
        };
      } else {
        return { ...originalGetInitialPropsValue, usedSSR: true };
      }
    };
  }

  const CustomFronteggPage = (props: T) => {
    const { usedSSR } = props;
    if (!usedSSR) {
      throw new Error('withFronteggPage must be used with getServerSidePropsWithFrontegg or getInitialProps');
    }
    const { pageProps } = props;
    const { store } = useContext(FronteggStoreContext);
    const user = props.user ?? pageProps?.user;
    if (user) {
      store.dispatch(
        authActions.setState({
          isLoading: false,
          isAuthenticated: !!user,
          user,
        })
      );
      store.dispatch(authActions.loadTenants());
    }
    return (page as FunctionComponent<T>)(props);
  };
  CustomFronteggPage.getInitialProps = page.getInitialProps;

  return CustomFronteggPage;
};

const getFronteggServerSidePropsIfSession = async (req: IncomingMessage) => {
  const session = await getSession(req);

  if (session) {
    const userData = await getAllUserData({
      getSession: () => getSession(req),
      reqHeaders: req.headers,
    });
    return {
      props: {
        ...userData,
        usedSSR: true,
      },
    };
  }
  return undefined;
};

export async function getFronteggServerSideProps<Q extends ParsedUrlQuery = ParsedUrlQuery>(
  context: GetServerSidePropsContext<Q>
): Promise<GetServerSidePropsResult<any>> {
  const props = await getFronteggServerSidePropsIfSession(context.req);
  if (props) {
    return props;
  }

  return { props: { usedSSR: true } };
}

export async function getFronteggProtectedServerSideProps<
  P extends { [key: string]: any } = { [key: string]: any },
  Q extends ParsedUrlQuery = ParsedUrlQuery
>(context: GetServerSidePropsContext<Q>): Promise<GetServerSidePropsResult<any>> {
  const props = await getFronteggServerSidePropsIfSession(context.req);
  if (props) {
    return props;
  }

  let loginUrl = FronteggConfig.authRoutes.loginUrl ?? authInitialState.routes.loginUrl;

  if (!loginUrl.startsWith('/')) {
    loginUrl = `/${loginUrl}`;
  }
  return {
    redirect: {
      permanent: false,
      destination: `${loginUrl}?redirectUrl=${encodeURIComponent(context.resolvedUrl ?? context.req.url)}`,
    },
    props: {
      usedSSR: true,
    },
  } as GetServerSidePropsResult<P>;
}

export function getServerSidePropsWithFrontegg<
  P extends { usedSSR?: true } & { [key: string]: any } = { [key: string]: any },
  Q extends ParsedUrlQuery = ParsedUrlQuery
>(
  handler: (context: GetServerSidePropsContext<Q>) => Promise<GetServerSidePropsResult<P>>,
  { isProtectedRoute = true }
) {
  return async (context: GetServerSidePropsContext<Q>): Promise<GetServerSidePropsResult<P>> => {
    let fronteggServerSideProps: GetServerSidePropsResult<P>;
    if (isProtectedRoute) {
      fronteggServerSideProps = await getFronteggProtectedServerSideProps(context);
    } else {
      fronteggServerSideProps = await getFronteggServerSideProps(context);
    }
    const originalGetServerSideProps = await handler(context);
    //@ts-ignore
    return deepmerge(originalGetServerSideProps ?? {}, fronteggServerSideProps ?? {});
  };
}
