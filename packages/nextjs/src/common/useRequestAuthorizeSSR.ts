'use client';

import { useEffect } from 'react';
import { FronteggApp } from '@frontegg/js';
import { AllUserData } from '../types';

export default function useRequestAuthorizeSSR({ app, user, tenants, session }: { app: FronteggApp } & AllUserData) {
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
}
