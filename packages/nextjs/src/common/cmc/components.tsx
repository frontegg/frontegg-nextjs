'use client';

import {
  ChangePasswordFormProps,
  EditEmailFormProps,
  InviteUserDialogProps,
  ProfilePageProps,
  UsersTableProps,
} from '@frontegg/types';
import React, { FC } from 'react';
import { CMCComponent, FronteggCMCComponentProps } from './base';

export const UsersTable: FC<FronteggCMCComponentProps<UsersTableProps>> = (props) => {
  return <CMCComponent renderComponent='renderUsersTable' {...props} />;
};

export const InviteUserDialog: FC<FronteggCMCComponentProps<InviteUserDialogProps>> = (props) => {
  return <CMCComponent renderComponent='renderInviteUserDialog' {...props} />;
};

export const ChangePasswordForm: FC<FronteggCMCComponentProps<ChangePasswordFormProps>> = (props) => {
  return <CMCComponent renderComponent='renderChangePasswordForm' {...props} />;
};

export const ProfilePage: FC<FronteggCMCComponentProps<ProfilePageProps>> = (props) => {
  return <CMCComponent renderComponent='renderProfilePage' {...props} />;
};

export const EditEmailForm: FC<FronteggCMCComponentProps<EditEmailFormProps>> = (props) => {
  return <CMCComponent renderComponent='renderEditEmailForm' {...props} />;
};
