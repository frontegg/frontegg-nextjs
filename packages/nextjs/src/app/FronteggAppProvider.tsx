import React, { PropsWithChildren, ReactNode } from 'react';
import { ClientFronteggProvider } from './ClientFronteggProvider';
import { getAppHeaders, getAppSession } from './helpers';
import config from '../config';
import fetchUserData from '../utils/fetchUserData';
import { ClientFronteggProviderProps } from '../types';
import { getAppUrlForCustomLoginWithSubdomain } from './getAppUrlForCustomLoginWithSubdomain';
import { removeJwtSignatureFrom } from '../middleware/helpers';
import fronteggLogger from '../utils/fronteggLogger';
import { FRONTEGG_HOSTED_LOGIN_MIGRATION_WARNING } from './consts';

export type FronteggAppProviderProps = PropsWithChildren<
  Omit<ClientFronteggProviderProps, 'contextOptions' | 'envAppUrl' | 'envBaseUrl' | 'envClientId'>
> & {
  alwaysVisibleChildren?: ReactNode;
};

export const FronteggAppProvider = async (options: FronteggAppProviderProps) => {
  const { envAppUrl, ...appEnvConfig } = config.appEnvConfig;
  let userData = await fetchUserData({ getSession: getAppSession, getHeaders: getAppHeaders });
  const subDomainAppUrl = await getAppUrlForCustomLoginWithSubdomain(options.customLoginOptions?.subDomainIndex);
  const logger = fronteggLogger.child({ tag: 'FronteggAppProvider' });

  if (process.env['FRONTEGG_SECURE_JWT_ENABLED'] === 'true' && userData) {
    userData = removeJwtSignatureFrom(userData);
    userData.session = removeJwtSignatureFrom(userData?.session);
  }
  if (Object.hasOwn(options, 'hostedLoginBox')) {
    logger.warn(FRONTEGG_HOSTED_LOGIN_MIGRATION_WARNING);
  }

  const providerProps = {
    ...appEnvConfig,
    ...userData,
    ...options,
    shouldRequestAuthorize: true,
    envAppUrl: subDomainAppUrl ?? envAppUrl,
    secureJwtEnabled: options.secureJwtEnabled ?? false,
    hostedLoginBox: appEnvConfig.envHostedLoginBox ?? options.hostedLoginBox ?? false,
  };

  return <ClientFronteggProvider {...providerProps} />;
};
