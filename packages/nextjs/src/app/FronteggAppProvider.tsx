import React, { PropsWithChildren } from 'react';
import { ClientFronteggProvider } from './ClientFronteggProvider';
import { getAppHeaders, getAppSession } from './helpers';
import config from '../config';
import fetchUserData from '../utils/fetchUserData';
import { ClientFronteggProviderProps } from '../types';

export type FronteggAppProviderProps = PropsWithChildren<Omit<ClientFronteggProviderProps, 'contextOptions'>>;

export const FronteggAppProvider = async (options: FronteggAppProviderProps) => {
  const appEnvConfig = config.appEnvConfig;
  const userData = await fetchUserData({ getSession: getAppSession, getHeaders: getAppHeaders });

  const providerProps = {
    ...appEnvConfig,
    ...userData,
    ...options,
  };

  return <ClientFronteggProvider {...providerProps} />;
};
