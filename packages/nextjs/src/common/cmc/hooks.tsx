'use client';

import { InviteUserDialogContextData, UsersTableContextData } from '@frontegg/types';
import React, { useContext, useState } from 'react';
import { AppContext, useSnapshot } from '../..';
import { createProxy } from '@frontegg/redux-store';
export const useUsersTable = (id?: string): UsersTableContextData => {
  const app = useContext(AppContext)!;
  const [store, setStore] = useState<UsersTableContextData>(createProxy({
    onSearch: () => { },
    searchQuery: '',
    searching: false,
  }));

  React.useLayoutEffect(() => {
    app
      .getUsersTableStore({ id })
      .then((store) => {
        setStore(store as UsersTableContextData);
      })
      .catch((err) => {
        console.error('Error getting users table store', err);
      });
  }, []);

  return useSnapshot(store);
};

export const useInviteUserDialog = (id?: string): InviteUserDialogContextData => {
  const app = useContext(AppContext)!;
  const [store, setStore] = useState<InviteUserDialogContextData>(createProxy({
    openDialog: () => { },
    closeDialog: () => { },
    dialogOpen: false,
  }));

  React.useLayoutEffect(() => {
    app
      .getInviteUserDialogStore({ id })
      .then((store) => {
        setStore(store as InviteUserDialogContextData);
      })
      .catch((err) => {
        console.error('Error getting invite user dialog store', err);
      });
  }, []);


  return useSnapshot(store);
};
