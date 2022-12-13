import React, { PropsWithChildren } from 'react';
import { getSession } from './getSessionNext13';
import { FronteggClientProviderNext13 } from '../client';
import { FronteggAppOptions } from '@frontegg/types';
import { getMeAndTenants } from '../common';
import { headers } from 'next/headers';

export const FronteggAppProvider = async ({
  children,
  ...options
}: PropsWithChildren<Omit<FronteggAppOptions, 'contextOptions'>>) => {
  const session = await getSession();
  const allHeaders = {} as any;
  headers().forEach((value, key) => (allHeaders[key] = value));

  const { user, tenants } = await getMeAndTenants(allHeaders, session?.accessToken);

  const envAppUrl = process.env['FRONTEGG_APP_URL'];
  const envBaseUrl = process.env['FRONTEGG_BASE_URL'];
  const envClientId = process.env['FRONTEGG_CLIENT_ID'];

  if (!envAppUrl) {
    throw Error('@frontegg/nextjs: .env.local must contain FRONTEGG_APP_URL');
  }
  if (!envBaseUrl) {
    throw Error('@frontegg/nextjs: .env.local must contain FRONTEGG_BASE_URL');
  }
  if (!envClientId) {
    throw Error('@frontegg/nextjs: .env.local must contain FRONTEGG_CLIENT_ID');
  }

  return (
    <FronteggClientProviderNext13 {...{ session, envAppUrl, envBaseUrl, envClientId, user, tenants }} {...options}>
      {children}
    </FronteggClientProviderNext13>
  );
};
