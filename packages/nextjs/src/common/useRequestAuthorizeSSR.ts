'use client';

import { useEffect } from 'react';
import { FronteggApp } from '@frontegg/js';
import { AllUserData } from '../types';

export default function useRequestAuthorizeSSR({ app, user, tenants, session }: { app: FronteggApp } & AllUserData) {
  const userWithTokensOrNull = user
    ? {
        ...user,
        refreshToken: session?.refreshToken,
        accessToken: user.accessToken ?? session?.accessToken,
      }
    : null;
  useEffect(() => {
    app?.store.dispatch({
      type: 'auth/requestAuthorizeSSR',
      payload: {
        accessToken: session?.accessToken,
        user: userWithTokensOrNull,
        tenants,
      },
    });
  }, [app]);
}
