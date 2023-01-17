import { FronteggStoreContext } from '@frontegg/react-hooks';
import { authActions } from '@frontegg/redux-store';
import type { AppInitialProps, AppProps } from 'next/app';
import type { NextPageContext } from 'next/dist/shared/lib/utils';
import { useContext } from 'react';
import { FronteggConfig, fronteggErrors, getAllUserData } from './common';
import { refreshToken } from './refreshToken';

export const withFronteggPage = (page: any) => {
  const originalGetInitialProps = page.getInitialProps;

  page.getInitialProps = page.getInitialProps = async (ctx: NextPageContext): Promise<AppInitialProps> => {
    const originalGetInitialPropsValue = originalGetInitialProps ? await originalGetInitialProps(ctx) : {};

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
      return originalGetInitialPropsValue;
    }
  };

  function CustomFronteggPage(props: AppProps) {
    const { pageProps } = props;
    const { store } = useContext(FronteggStoreContext);

    if (pageProps?.user) {
      store.dispatch(
        authActions.setState({
          isLoading: false,
          isAuthenticated: !!pageProps?.user,
          user: pageProps?.user,
        })
      );
    }
    return page(props);
  }

  CustomFronteggPage.getInitialProps = page.getInitialProps;

  return CustomFronteggPage;
};
