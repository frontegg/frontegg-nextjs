'use client';

import type { ClientFronteggProviderProps } from '../types';
import { FronteggBaseProvider } from '../common';
import { useRouter } from 'next/navigation';
import React, { FC, useMemo } from 'react';
import { createTenantResolverForClientProvider } from './createTenantResolverForClientProvider';

export const ClientFronteggProvider: FC<ClientFronteggProviderProps> = ({
  children,
  basename,
  contextOptions,
  customLoginOptions,
  ...props
}) => {
  const router = useRouter();
  const basePath = process.env.__NEXT_ROUTER_BASEPATH || '';

  const tenantResolver = useMemo(() => createTenantResolverForClientProvider(customLoginOptions), [customLoginOptions]);

  return (
    <FronteggBaseProvider
      router={router}
      basename={basename ?? basePath}
      contextOptions={{ ...contextOptions, tenantResolver }}
      {...props}
    >
      {children}
    </FronteggBaseProvider>
  );
};
