import { useRouter } from 'next/router';
import React, { FC } from 'react';
import { FronteggBaseProvider } from '../../common';
import { FronteggProviderProps } from '../../types';

const FronteggPagesProvider: FC<Omit<FronteggProviderProps, 'router'>> = ({ children, basename, ...props }) => {
  const router = useRouter();
  const baseName = basename ?? router.basePath;

  return (
    <FronteggBaseProvider router={router} basename={baseName} {...props}>
      {children}
    </FronteggBaseProvider>
  );
};

export default FronteggPagesProvider;
