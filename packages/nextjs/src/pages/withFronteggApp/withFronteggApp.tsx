import { FronteggAppOptions } from '@frontegg/types';
import type { AppContext, AppInitialProps, AppProps } from 'next/app';
import React from 'react';
import { getAllUserData } from '../../common';
import type { FronteggCustomApp, WithFronteggAppOptions } from './types';
import { FronteggProvider } from '../../FronteggProvider';
import refreshAccessToken from '../../utils/refreshAccessToken';
import config from '../../config';
import { FronteggCustomAppClass } from './types';
import { AllUserData } from '../../types';
import * as process from 'process';

export const withFronteggApp = (app: FronteggCustomAppClass, options?: WithFronteggAppOptions): FronteggCustomApp => {
  const originalGetInitialProps = app.getInitialProps;

  app.getInitialProps = async (appContext: AppContext & AllUserData): Promise<AppInitialProps> => {
    const { ctx, Component } = appContext;

    let appEnvConfig = {};
    let appContextSessionData: AllUserData = {
      session: null,
      user: null,
      tenants: null,
    };

    if (ctx.req) {
      appEnvConfig = config.appEnvConfig;
      const userData = await getAllUserData({
        getSession: async () => await refreshAccessToken(ctx),
        reqHeaders: ctx.req?.headers,
      });
      Object.assign(appContextSessionData, userData);
    }

    Object.assign(appContext, appContextSessionData);

    return {
      pageProps: {
        ...(originalGetInitialProps ? await originalGetInitialProps(appContext) : {}),
        ...(Component.getInitialProps ? await Component.getInitialProps(ctx) : {}),
        ...(appContextSessionData.session == null ? {} : appContextSessionData),
        ...appEnvConfig,
      },
    };
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
