'use client';
import { AdminPortal } from '@frontegg/nextjs';

export const AdminPortalButton = ({ className }: { className: string }) => {
  return (
    <div className={className} onClick={() => AdminPortal.show()} style={{ cursor: 'pointer' }}>
      <h2>
        Admin Portal <span>-&gt;</span>
      </h2>
      <p>Explore admin-portal capabilities and options</p>
    </div>
  );
};
