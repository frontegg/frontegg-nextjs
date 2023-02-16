'use client';

import { FronteggApp } from '@frontegg/js';
import { useEffect } from 'react';
import { AllUserData } from '../../../types';

export const useRequestAuthorizeSSR = ({ app, user, tenants, session }: { app: FronteggApp } & AllUserData) => {
  useEffect(() => {
    app?.store.dispatch({
      type: 'auth/requestAuthorizeSSR',
      payload: {
        accessToken: session?.accessToken,
        user: user ? { ...user, refreshToken: session?.refreshToken } : null,
        tenants,
      },
    });
  }, [app]);
};
