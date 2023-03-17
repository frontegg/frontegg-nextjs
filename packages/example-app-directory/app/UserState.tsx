'use client';
import { useAuthUserOrNull, useLoginWithRedirect, AdminPortal } from '@frontegg/nextjs';

export const UserState = () => {
  const user = useAuthUserOrNull();
  const loginWithRedirect = useLoginWithRedirect();
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
        Hosted login
      </button>
    </div>
  );
};
