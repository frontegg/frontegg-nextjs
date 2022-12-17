import { FronteggProviderProps } from '../common';
import { FronteggBaseProvider } from '../common-client';
import { useRouter } from 'next/navigation';
import React, { FC } from 'react';

export const FronteggClientProviderNext13: FC<Omit<FronteggProviderProps, 'router'>> = ({ children, ...props }) => {
  const router = useRouter();

  return (
    <FronteggBaseProvider router={router} {...props}>
      {children}
    </FronteggBaseProvider>
  );
};
