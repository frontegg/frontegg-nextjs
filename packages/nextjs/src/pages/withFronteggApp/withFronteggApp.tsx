import React from 'react';
import type { AppContext, AppInitialProps, AppProps } from 'next/app';
import type { FronteggCustomAppClass, FronteggCustomApp, WithFronteggAppOptions } from './types';
import FronteggProvider from '../FronteggPagesProvider';
import refreshAccessTokenIfNeeded, { isRuntimeNextRequest } from '../../utils/refreshAccessTokenIfNeeded';
import fetchUserData from '../../utils/fetchUserData';
import config from '../../config';
import { AllUserData } from '../../types';
import { removeJwtSignatureFrom } from '../../middleware/helpers';
import { shouldBypassGetInitialProps } from './shouldBypassGetInitialProps';
import fronteggLogger from '../../utils/fronteggLogger';

export const withFronteggApp = (app: FronteggCustomAppClass, options?: WithFronteggAppOptions): FronteggCustomApp => {
  const originalGetInitialProps = app.getInitialProps;

  app.getInitialProps = async (appContext: AppContext & AllUserData): Promise<AppInitialProps> => {
    const { ctx, router, Component } = appContext;
    const logger = fronteggLogger.child({ tag: 'withFronteggApp' });
    const isSSG = router.isReady == false && router.isPreview == false;
    config.checkHostedLoginConfig(options);

    let appEnvConfig = {};
    const appContextSessionData: AllUserData = {
      session: null,
      user: null,
      tenants: null,
    };
    if (shouldBypassGetInitialProps(ctx.req?.url ?? '/', ctx.req?.headers)) {
      logger.debug('Bypassing get initial props for url: ' + (ctx.req?.url ?? ''));
      return {
        pageProps: {
          ...(originalGetInitialProps ? await originalGetInitialProps(appContext) : {}),
          ...(Component.getInitialProps ? await Component.getInitialProps(ctx) : {}),
        },
      };
    }

    let shouldRequestAuthorize = false;

    if (ctx.req) {
      appEnvConfig = config.appEnvConfig;

      if (isSSG) {
        shouldRequestAuthorize = true;
      } else {
        const url = ctx.req?.url;

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
      envHostedLoginBox,
      shouldRequestAuthorize,
    } = appProps.pageProps;

    return (
      <FronteggProvider
        {...options}
        hostedLoginBox={envHostedLoginBox}
        {...{
          user,
          tenants,
          activeTenant,
          session,
          envAppUrl,
          envBaseUrl,
          envHostedLoginBox,
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
