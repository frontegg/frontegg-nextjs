'use client';

import { useAuth } from '@frontegg/nextjs';
import { FC } from 'react';

const AppLoader: FC = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div>
        <h1>Frontegg custom loader</h1>
      </div>
    );
  }
  return <></>;
};
export default AppLoader;
