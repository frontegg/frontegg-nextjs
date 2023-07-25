import React, { PropsWithChildren } from 'react';
import { ClientFronteggProvider } from './ClientFronteggProvider';
import { getAppHeaders, getAppSession } from './helpers';
import config from '../config';
import fetchUserData from '../utils/fetchUserData';
import { ClientFronteggProviderProps } from '../types';
import { getAppUrlForCustomLoginWithSubdomain } from './getAppUrlForCustomLoginWithSubdomain';

export type FronteggAppProviderProps = PropsWithChildren<Omit<ClientFronteggProviderProps, 'contextOptions'>>;

export const FronteggAppProvider = async (options: FronteggAppProviderProps) => {
  let { envAppUrl, ...appEnvConfig } = config.appEnvConfig;
  const userData = await fetchUserData({ getSession: getAppSession, getHeaders: getAppHeaders });
  if (options.customLoginOptions?.subDomainIndex !== undefined) {
    const subDomainAppUrl = await getAppUrlForCustomLoginWithSubdomain(options.customLoginOptions.subDomainIndex);
    if (subDomainAppUrl) {
      envAppUrl = subDomainAppUrl;
      config.setAppUrl(subDomainAppUrl);
    }
  }

  const providerProps = {
    ...appEnvConfig,
    ...userData,
    ...options,
    envAppUrl,
  };

  return <ClientFronteggProvider {...providerProps} />;
};
