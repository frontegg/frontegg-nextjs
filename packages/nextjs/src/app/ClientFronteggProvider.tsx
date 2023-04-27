'use client';

import type { ClientFronteggProviderProps } from '../types';
import { FronteggBaseProvider } from '../common';
import { useRouter } from 'next/navigation';
import React, { FC, useCallback } from 'react';

export const ClientFronteggProvider: FC<ClientFronteggProviderProps> = ({
  children,
  basename,
  contextOptions,
  ...props
}) => {
  const router = useRouter();
  const basePath = process.env.__NEXT_ROUTER_BASEPATH || '';

  const tenantResolver = props.customLogin
    ? useCallback(() => {
        const tenantSubdomainIndex = props.customLogin?.subDomainIndex;
        const tenantParamKey = props.customLogin?.paramKey;
        if (tenantSubdomainIndex) {
          return { tenant: window.location.hostname.split('.')[tenantSubdomainIndex] };
        } else if (tenantParamKey) {
          const params = new URLSearchParams(window.location.search);
          const tenant = params.get(tenantParamKey);
          return { tenant };
        }
        return { tenant: null };
      }, [props.customLogin])
    : undefined;

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
