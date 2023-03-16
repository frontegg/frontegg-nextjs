'use client';

import config from '../config';
import { authInitialState } from '@frontegg/redux-store';
import { useContext, useEffect } from 'react';
import { useLoginActions, useLoginWithRedirect } from '@frontegg/react-hooks';
import { FRONTEGG_AFTER_AUTH_REDIRECT_URL } from '../utils/common/constants';
import AppContext from './AppContext';
import React from 'react';
import { ParsedUrlQuery } from 'querystring';

interface FronteggRouterBaseProps {
  queryParams?: ParsedUrlQuery;
  pathArr: string[];
}

export function FronteggRouterBase(props: FronteggRouterBaseProps) {
  const { queryParams = {}, pathArr } = props;
  const app = useContext(AppContext);
  const loginWithRedirect = useLoginWithRedirect();
  const { logout } = useLoginActions();

  useEffect(() => {
    if (!app) {
      return;
    }
    if (app.options.hostedLoginBox) {
      const routesObj = {
        ...authInitialState.routes,
        ...config.authRoutes,
      };

      const pathname = `/${pathArr.join('/')}`;
      if (pathname === routesObj.loginUrl) {
        if (queryParams.redirectUrl) {
          localStorage.setItem(FRONTEGG_AFTER_AUTH_REDIRECT_URL, `${window.location.origin}${queryParams.redirectUrl}`);
        }
        loginWithRedirect();
      } else if (pathname === routesObj.logoutUrl) {
        logout(() => (window.location.href = window.location.origin));
      }
    }
  }, [app, queryParams, pathArr, loginWithRedirect, logout]);
  return <></>;
}
