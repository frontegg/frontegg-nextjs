import React, { PropsWithChildren } from 'react';
import { FronteggClientProviderNext13 } from '../client';
import { FronteggAppOptions } from '@frontegg/types';
import { getHeaders, getSession } from './utils';
import config from '../config';
import fetchUserData from '../utils/fetchUserData';
import refreshAccessToken from '../utils/refreshAccessToken';
import { fronteggRefreshTokenUrl } from '@frontegg/rest-api';
import { cookies, headers } from 'next/headers';
import { buildRequestHeaders } from '../api/utils';

export const FronteggAppProvider = async (options: PropsWithChildren<Omit<FronteggAppOptions, 'contextOptions'>>) => {
  const appEnvConfig = config.appEnvConfig;

  const userData = await fetchUserData({ getSession, getHeaders });

  console.log(userData);
  const providerProps = {
    ...appEnvConfig,
    ...userData,
    ...options,
  };

  return <FronteggClientProviderNext13 {...providerProps} />;
};
