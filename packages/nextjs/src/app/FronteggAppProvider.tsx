import React, { PropsWithChildren } from 'react';
import { ClientFronteggProvider } from './ClientFronteggProvider';
import { getAppHeadersPromise, getAppSession } from './helpers';
import config from '../config';
import fetchUserData from '../utils/fetchUserData';
import { ClientFronteggProviderProps } from '../types';
import { getAppUrlForCustomLoginWithSubdomain } from './getAppUrlForCustomLoginWithSubdomain';
import { removeJwtSignatureFrom } from '../middleware/helpers';

export type FronteggAppProviderProps = PropsWithChildren<
  Omit<ClientFronteggProviderProps, 'contextOptions' | 'envAppUrl' | 'envBaseUrl' | 'envClientId'>
>;

export const FronteggAppProvider = async (options: FronteggAppProviderProps) => {
  const { envAppUrl, ...appEnvConfig } = config.appEnvConfig;
  let userData = await fetchUserData({ getSession: getAppSession, getHeaders: getAppHeadersPromise });
  const subDomainAppUrl = await getAppUrlForCustomLoginWithSubdomain(options.customLoginOptions?.subDomainIndex);

  if (process.env['FRONTEGG_SECURE_JWT_ENABLED'] === 'true' && userData) {
    userData = removeJwtSignatureFrom(userData);
    userData.session = removeJwtSignatureFrom(userData?.session);
  }
  const providerProps = {
    ...appEnvConfig,
    ...userData,
    ...options,
    envAppUrl: subDomainAppUrl ?? envAppUrl,
    secureJwtEnabled: options.secureJwtEnabled ?? false,
  };

  return <ClientFronteggProvider {...providerProps} />;
};
