'use client';

import { FronteggProviderProps } from '../common';
import { FronteggBaseProvider } from '../common/client';
import { useRouter } from 'next/navigation';
import React, { FC } from 'react';

export const FronteggClientProviderNext13: FC<Omit<FronteggProviderProps, 'router'>> = ({
  children,
  basename,
  ...props
}) => {
  const router = useRouter();
  const basePath = process.env.__NEXT_ROUTER_BASEPATH || '';

  return (
    <FronteggBaseProvider router={router} basename={basename ?? basePath} {...props}>
      {children}
    </FronteggBaseProvider>
  );
};
