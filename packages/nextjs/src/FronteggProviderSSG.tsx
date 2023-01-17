import getConfig from 'next/config';
import { useRouter } from 'next/router';
import React, { FC } from 'react';
import { fronteggErrors, FronteggProviderProps } from './common';
import { FronteggBaseProvider } from './common/client';

export const FronteggProviderSSG: FC<Omit<
  FronteggProviderProps,
  'router' | 'envAppUrl' | 'envBaseUrl' | 'envClientId'
>> = ({ basename, ...props }) => {
  const {
    publicRuntimeConfig: { fronteggClientId, fronteggAppUrl, fronteggBaseUrl },
  } = getConfig();

  if (!fronteggAppUrl) {
    throw Error(fronteggErrors.envAppUrl);
  }
  if (!fronteggBaseUrl) {
    throw Error(fronteggErrors.envBaseUrl);
  }
  if (!fronteggClientId) {
    throw Error(fronteggErrors.envClientId);
  }
  const router = useRouter();
  const baseName = basename ?? router.basePath;

  return (
    <FronteggBaseProvider
      basename={baseName}
      router={router}
      envAppUrl={fronteggAppUrl}
      envBaseUrl={fronteggBaseUrl}
      envClientId={fronteggClientId}
      {...props}
    >
      {props.children}
    </FronteggBaseProvider>
  );
};
