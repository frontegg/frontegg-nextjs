'use client';
import styles from './page.module.css';
import { AdminPortal } from '@frontegg/nextjs';

export const AdminPortalButton = () => {
  return (
    <div className={styles.card} onClick={() => AdminPortal.show()}>
      <h2>
        Admin Portal <span>-&gt;</span>
      </h2>
      <p>Explore admin-portal capabilities and options</p>
    </div>
  );
};
