import React, { useEffect } from 'react';
import { useAuthActions, useAuthUserOrNull } from '@frontegg/react-hooks';

export const ExpireInListener = () => {
  const user = useAuthUserOrNull();
  const actions = useAuthActions();
  useEffect(() => {
    if (user && user?.expiresIn == null) {
      actions.setUser({
        ...user,
        expiresIn: Math.floor(((user as any)['exp'] * 1000 - Date.now()) / 1000),
      });
    }
  }, [actions, user]);
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <></>;
};
