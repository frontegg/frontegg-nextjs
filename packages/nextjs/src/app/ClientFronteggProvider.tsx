'use client';

import type { FronteggProviderProps } from '../types';
import { FronteggBaseProvider } from '../common';
import { useRouter } from 'next/navigation';
import React, { FC } from 'react';

export const ClientFronteggProvider: FC<Omit<FronteggProviderProps, 'router'>> = ({ children, basename, ...props }) => {
  const router = useRouter();
  const basePath = process.env.__NEXT_ROUTER_BASEPATH || '';

  return (
    <FronteggBaseProvider router={router} basename={basename ?? basePath} {...props}>
      {children}
    </FronteggBaseProvider>
  );
};
