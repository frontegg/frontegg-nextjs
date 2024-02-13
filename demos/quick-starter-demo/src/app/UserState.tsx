'use client';
import { useAuthUserOrNull } from '@frontegg/nextjs';
import { useState } from 'react';
import Link from 'next/link';

export const UserState = () => {
  const user = useAuthUserOrNull();
  const [open, setOpen] = useState(false);

  const toggleUserMenu = () => {
    setOpen((state) => !state);
  };

  /*
   * Replace the elements below with your own.
   */
  if (!user) {
    return null;
  }
  return (
    <>
      <img
        src={user.profilePictureUrl ?? ''}
        alt={user?.name ?? ''}
        width='50'
        height='50'
        style={{ borderRadius: '50%', cursor: 'pointer' }}
        onClick={() => toggleUserMenu()}
      />

      {open && (
        <div style={{ position: 'absolute' }}>
          <br />
          <div>{user.email}</div>
          <br />
          <Link style={{ width: 'fit-content' }} href={'/account/logout'}>
            Log out
          </Link>
        </div>
      )}
    </>
  );
};
