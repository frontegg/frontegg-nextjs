import React from 'react';
import type { AppContext, AppInitialProps, AppProps } from 'next/app';
import type { FronteggCustomAppClass, FronteggCustomApp, WithFronteggAppOptions } from './types';
import FronteggProvider from '../FronteggPagesProvider';
import refreshAccessTokenIfNeeded, { isRuntimeNextRequest } from '../../utils/refreshAccessTokenIfNeeded';
import fetchUserData from '../../utils/fetchUserData';
import config from '../../config';
import { AllUserData } from '../../types';

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
      const url = ctx.req?.url;

      if (url && isRuntimeNextRequest(url)) {
        const session = await refreshAccessTokenIfNeeded(ctx);
        Object.assign(appContextSessionData, { session });
      } else {
        const userData = await fetchUserData({
          getSession: async () => await refreshAccessTokenIfNeeded(ctx),
          getHeaders: async () => ctx.req?.headers ?? {},
        });
        Object.assign(appContextSessionData, userData);
      }
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

  function CustomFronteggApp(appProps: AppProps) {
    const { user, tenants, activeTenant, session, envAppUrl, envBaseUrl, envClientId } = appProps.pageProps;
    return (
      <FronteggProvider {...options} {...{ user, tenants, activeTenant, session, envAppUrl, envBaseUrl, envClientId }}>
        {app(appProps) as any}
      </FronteggProvider>
    );
  }

  CustomFronteggApp.getInitialProps = app.getInitialProps;

  return CustomFronteggApp as FronteggCustomApp;
};
