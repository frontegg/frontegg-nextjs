import { FronteggAppOptions } from '@frontegg/types';
import type { AppContext, AppInitialProps, AppProps } from 'next/app';
import type { AppContextType, AppPropsType, NextComponentType } from 'next/dist/shared/lib/utils';
import React from 'react';
import { FronteggConfig, fronteggErrors, FronteggNextJSSession, getMeAndTenants, MeAndTenantsResponse } from './common';
import { FronteggProvider } from './FronteggProvider';
import { refreshToken } from './refreshToken';

type FronteggCustomApp = NextComponentType<
  AppContextType & { session: FronteggNextJSSession | null },
  AppInitialProps,
  AppPropsType
>;
export const withFronteggApp = (
  app: ((props: AppProps) => JSX.Element) & {
    getInitialProps?: FronteggCustomApp['getInitialProps'];
  },
  options?: Omit<FronteggAppOptions, 'contextOptions'> & {
    contextOptions?: FronteggAppOptions['contextOptions'];
  }
): FronteggCustomApp => {
  const originalGetInitialProps: FronteggCustomApp['getInitialProps'] | undefined = app.getInitialProps;

  app.getInitialProps = async (
    appContext: AppContext & {
      session: FronteggNextJSSession | null;
    } & MeAndTenantsResponse
  ): Promise<AppInitialProps> => {
    const { ctx, Component } = appContext;
    if (ctx.req) {
      const session = await refreshToken(ctx);
      console.log({ session });
      const { user, tenants } = await getMeAndTenants(ctx.req?.headers, session?.accessToken);
      appContext.session = session;
      appContext.user = user;
      appContext.tenants = tenants;
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
        pageProps: {
          ...(originalGetInitialProps ? await originalGetInitialProps(appContext) : {}),
          ...(Component.getInitialProps ? await Component.getInitialProps(ctx) : {}),
          session,
          user,
          tenants,
          envAppUrl,
          envBaseUrl: process.env['FRONTEGG_BASE_URL'],
          envClientId: process.env['FRONTEGG_CLIENT_ID'],
        },
      };
    } else {
      appContext.session = null;
      return {
        pageProps: {
          ...(originalGetInitialProps ? await originalGetInitialProps(appContext) : {}),
          ...(Component.getInitialProps ? await Component.getInitialProps(ctx) : {}),
        },
      };
    }
  };

  FronteggConfig.authRoutes = options?.authOptions?.routes ?? {};
  FronteggConfig.fronteggAppOptions = options ?? {};

  function CustomFronteggApp(appProps: AppProps) {
    const { user, tenants, session, envAppUrl, envBaseUrl, envClientId } = appProps.pageProps;
    return (
      <FronteggProvider {...options} {...{ user, tenants, session, envAppUrl, envBaseUrl, envClientId }}>
        {app(appProps) as any}
      </FronteggProvider>
    );
  }

  CustomFronteggApp.getInitialProps = app.getInitialProps;

  return CustomFronteggApp as FronteggCustomApp;
};
