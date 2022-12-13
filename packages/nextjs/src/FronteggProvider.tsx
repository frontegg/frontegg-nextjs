import { useRouter } from 'next/router';
import React, { FC } from 'react';
import { FronteggBaseProvider } from './client';
import { FronteggProviderProps } from './common';

export const FronteggProvider: FC<Omit<FronteggProviderProps, 'router'>> = ({ children, basename, ...props }) => {
  const router = useRouter();
  const baseName = basename ?? router.basePath;

  return (
    <FronteggBaseProvider router={router} basename={baseName} {...props}>
      {children}
    </FronteggBaseProvider>
  );
};
