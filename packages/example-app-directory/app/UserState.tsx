'use client';
import { useAuthUserOrNull, useLoginWithRedirect, AdminPortal, useLogoutHostedLogin } from '@frontegg/nextjs';
import Link from 'next/link';

export const UserState = () => {
  const user = useAuthUserOrNull();
  const loginWithRedirect = useLoginWithRedirect();
  const logoutHosted = useLogoutHostedLogin();

  /*
   * Replace the elements below with your own.
   *
   * Note: The corresponding styles are in the ./index.css file.
   */
  return (
    <div>
      <div>{user?.email ?? 'not logged in'}</div>

      <br />
      <br />
      <button
        onClick={() => {
          AdminPortal.show();
        }}
      >
        Open AdminPortal
      </button>
      <br />
      <button
        onClick={() => {
          loginWithRedirect();
        }}
      >
        Open hosted login
      </button>
      <br />
      <button
        onClick={() => {
          logoutHosted();
        }}
      >
        logout hosted login
      </button>
      <br />
      <br />
      <Link href='/account/logout'>logout embedded</Link>
    </div>
  );
};
