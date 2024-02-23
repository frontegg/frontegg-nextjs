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

  // TODO: consider using useMemo instead of useEffect
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
