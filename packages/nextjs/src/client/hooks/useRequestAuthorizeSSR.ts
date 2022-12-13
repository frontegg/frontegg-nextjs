import { FronteggApp } from '@frontegg/js';
import { useEffect } from 'react';
import { MeAndTenantsResponse } from '../../common/types';

type useRequestAuthorizeSSR = {
  app: FronteggApp;
  accessToken?: string;
  refreshToken?: string;
} & MeAndTenantsResponse;

export const useRequestAuthorizeSSR = ({ app, accessToken, user, tenants, refreshToken }: useRequestAuthorizeSSR) => {
  useEffect(() => {
    app?.store.dispatch({
      type: 'auth/requestAuthorizeSSR',
      payload: {
        accessToken,
        user: user ? { ...user, refreshToken } : null,
        tenants,
      },
    });
  }, [app]);
};
