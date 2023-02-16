import { FronteggAppOptions } from '@frontegg/types';
import type { AppContext, AppInitialProps, AppProps } from 'next/app';
import type { AppContextType, AppPropsType, NextComponentType } from 'next/dist/shared/lib/utils';
import React from 'react';
import { getAllUserData } from './common';
import type { AllUserData } from './types';
import { FronteggProvider } from './FronteggProvider';
import refreshAccessToken from './utils/refreshAccessToken';
import config, { EnvVariables } from './config';
import { FronteggEnvNotFound } from './utils/errors';

type FronteggCustomApp = NextComponentType<AppContextType & AllUserData, AppInitialProps, AppPropsType>;
export const withFronteggApp = (
  app: ((props: AppPropsType<any>) => JSX.Element) & {
    getInitialProps?: FronteggCustomApp['getInitialProps'];
  },
  options?: Omit<FronteggAppOptions, 'contextOptions'> & {
    contextOptions?: FronteggAppOptions['contextOptions'];
  }
): FronteggCustomApp => {
  const originalGetInitialProps: FronteggCustomApp['getInitialProps'] | undefined = app.getInitialProps;

  app.getInitialProps = async (appContext: AppContext & AllUserData): Promise<AppInitialProps> => {
    const { ctx, Component } = appContext;
    if (ctx.req) {
      const { user, tenants, session } = await getAllUserData({
        getSession: async () => await refreshAccessToken(ctx),
        reqHeaders: ctx.req?.headers,
      });
      appContext.session = session;
      appContext.user = user;
      appContext.tenants = tenants;
      const { envAppUrl, envBaseUrl, envClientId } = config.appEnvConfig;
      if (!envAppUrl) {
        throw new FronteggEnvNotFound(EnvVariables.FRONTEGG_APP_URL);
      }
      if (!envBaseUrl) {
        throw new FronteggEnvNotFound(EnvVariables.FRONTEGG_BASE_URL);
      }
      if (!envClientId) {
        throw new FronteggEnvNotFound(EnvVariables.FRONTEGG_CLIENT_ID);
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

  config.authRoutes = options?.authOptions?.routes ?? {};
  config.fronteggAppOptions = options ?? {};

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
