import React from 'react';
import type { AppContext, AppInitialProps, AppProps } from 'next/app';
import type { FronteggCustomAppClass, FronteggCustomApp, WithFronteggAppOptions } from './types';
import FronteggProvider from '../FronteggPagesProvider';
import refreshAccessTokenIfNeeded, { isRuntimeNextRequest } from '../../utils/refreshAccessTokenIfNeeded';
import fetchUserData from '../../utils/fetchUserData';
import config from '../../config';
import { AllUserData } from '../../types';
import { removeJwtSignatureFrom } from '../../middleware/helpers';

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
    let shouldRequestAuthorize = false;

    if (ctx.req) {
      appEnvConfig = config.appEnvConfig;
      const url = ctx.req?.url;

      console.log('withFronteggApp', url);

      if (url && isRuntimeNextRequest(url)) {
        let session = await refreshAccessTokenIfNeeded(ctx);
        if (process.env['FRONTEGG_SECURE_JWT_ENABLED'] === 'true') {
          session = removeJwtSignatureFrom(session);
        }
        Object.assign(appContextSessionData, { session });
      } else {
        let userData = await fetchUserData({
          getSession: async () => await refreshAccessTokenIfNeeded(ctx),
          getHeaders: async () => ctx.req?.headers ?? {},
        });
        if (process.env['FRONTEGG_SECURE_JWT_ENABLED'] === 'true' && userData) {
          userData = removeJwtSignatureFrom(userData);
          userData.session = removeJwtSignatureFrom(userData?.session);
        }
        shouldRequestAuthorize = true;
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
        shouldRequestAuthorize,
      },
    };
  };

  function CustomFronteggApp(appProps: AppProps) {
    const {
      user,
      tenants,
      activeTenant,
      session,
      envAppUrl,
      envBaseUrl,
      envClientId,
      secureJwtEnabled,
      envAppId,
      shouldRequestAuthorize,
    } = appProps.pageProps;

    return (
      <FronteggProvider
        {...options}
        {...{
          user,
          tenants,
          activeTenant,
          session,
          envAppUrl,
          envBaseUrl,
          secureJwtEnabled,
          shouldRequestAuthorize,
          isSSG: appProps.__N_SSG,
          envClientId,
          envAppId,
        }}
      >
        {app(appProps) as any}
      </FronteggProvider>
    );
  }

  CustomFronteggApp.getInitialProps = app.getInitialProps;

  return CustomFronteggApp as FronteggCustomApp;
};
