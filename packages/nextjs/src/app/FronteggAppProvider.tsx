import React, { PropsWithChildren } from 'react';
import { ClientFronteggProvider } from './ClientFronteggProvider';
import { getAppHeadersPromise, getAppSession } from './helpers';
import config from '../config';
import fetchUserData from '../utils/fetchUserData';
import { ClientFronteggProviderProps } from '../types';
import { getAppUrlForCustomLoginWithSubdomain } from './getAppUrlForCustomLoginWithSubdomain';

export type FronteggAppProviderProps = PropsWithChildren<
  Omit<ClientFronteggProviderProps, 'contextOptions' | 'envAppUrl' | 'envBaseUrl' | 'envClientId'>
>;

export const FronteggAppProvider = async (options: FronteggAppProviderProps) => {
  const { envAppUrl, ...appEnvConfig } = config.appEnvConfig;
  const userData = await fetchUserData({ getSession: getAppSession, getHeaders: getAppHeadersPromise });
  const subDomainAppUrl = await getAppUrlForCustomLoginWithSubdomain(options.customLoginOptions?.subDomainIndex);

  const providerProps = {
    ...appEnvConfig,
    ...userData,
    ...options,
    envAppUrl: subDomainAppUrl ?? envAppUrl,
  };

  return <ClientFronteggProvider {...providerProps} />;
};
