import { useRouter } from 'next/router';
import React, { FC } from 'react';
import { FronteggBaseProvider } from './common/client';
import { FronteggProviderProps } from './types';

export const FronteggProvider: FC<Omit<FronteggProviderProps, 'router'>> = ({ children, basename, ...props }) => {
  const router = useRouter();
  const baseName = basename ?? router.basePath;

  debugger;
  return (
    <FronteggBaseProvider router={router} basename={baseName} {...props}>
      {children}
    </FronteggBaseProvider>
  );
};
