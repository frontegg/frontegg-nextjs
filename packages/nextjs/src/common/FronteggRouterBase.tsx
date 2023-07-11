'use client';

import config from '../config';
import { authInitialState } from '@frontegg/redux-store';
import { useContext, useEffect } from 'react';
import { useLoginActions, useLoginWithRedirect } from '@frontegg/react-hooks';
import { FRONTEGG_AFTER_AUTH_REDIRECT_URL } from '../utils/common/constants';
import AppContext from './AppContext';
import React from 'react';
import { ParsedUrlQuery } from 'querystring';
import { useLogoutHostedLogin } from './hooks';

interface FronteggRouterBaseProps {
  queryParams?: ParsedUrlQuery;
  pathArr: string[];
  isAppDirEnabled?: boolean;
}

export function FronteggRouterBase(props: FronteggRouterBaseProps) {
  const { queryParams = {}, pathArr, isAppDirEnabled } = props;
  const app = useContext(AppContext);
  const loginWithRedirect = useLoginWithRedirect();
  const { requestAuthorize } = useLoginActions();
  const logoutHosted = useLogoutHostedLogin();

  useEffect(() => {
    if (!app) {
      return;
    }
    const pathname = `/${pathArr.join('/')}`;
    const routesObj = {
      ...authInitialState.routes,
      ...config.authRoutes,
    };

    if (app.options.hostedLoginBox) {
      if (pathname === routesObj.loginUrl) {
        if (queryParams.redirectUrl) {
          localStorage.setItem(FRONTEGG_AFTER_AUTH_REDIRECT_URL, `${window.location.origin}${queryParams.redirectUrl}`);
        }
        loginWithRedirect();
      } else if (pathname === routesObj.logoutUrl) {
        logoutHosted(window.location.origin + window.location.search);
      }
    } else {
      if (pathname.startsWith(routesObj.hostedLoginRedirectUrl ?? '/oauth/callback')) {
        // if not hosted login, redirect the user to the authenticated url
        window.location.href = routesObj.authenticatedUrl;
      } else {
        const isSamlCallback = pathname === routesObj.samlCallbackUrl;
        const isLoginPage = pathname.startsWith(routesObj.loginUrl);
        if ((isAppDirEnabled && isLoginPage) || isSamlCallback) {
          requestAuthorize(true);
        }
      }
    }
  }, [app, queryParams, pathArr, loginWithRedirect, logoutHosted]);
  return <></>;
}
