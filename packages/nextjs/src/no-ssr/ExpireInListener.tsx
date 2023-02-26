'use client';

import React, { useEffect } from 'react';
import { useAuthActions, useAuthUserOrNull } from '@frontegg/react-hooks';
import { calculateExpiresInFromExp } from '../utils/common';

export default function ExpireInListener() {
  const user = useAuthUserOrNull();
  const actions = useAuthActions();
  useEffect(() => {
    if (user && user?.expiresIn == null) {
      actions.setUser({
        ...user,
        expiresIn: calculateExpiresInFromExp((user as any)['exp']),
      });
    }
  }, [actions, user]);
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <></>;
}
