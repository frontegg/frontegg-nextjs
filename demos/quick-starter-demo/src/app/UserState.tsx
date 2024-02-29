'use client';
import { useAuthUserOrNull } from '@frontegg/nextjs';
import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

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
        alt={user.name ?? 'user'}
        width='50'
        height='50'
        className={styles.user}
        onClick={() => toggleUserMenu()}
      />

      {open && (
        <div className={styles.dropdown}>
          <div>{user.email}</div>
          <Link href={'/account/logout'}>Log out</Link>
        </div>
      )}
    </>
  );
};
