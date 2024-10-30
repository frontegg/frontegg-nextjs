'use client';

import { useAuth } from '@frontegg/nextjs';
import Link from 'next/link';

export default function MainPage() {
  const { user } = useAuth();
  return (
    <div>
      <h3>Next JS application with frontegg</h3>

      <br />
      <br />
      <div>{user?.email ?? 'not logged in'}</div>
      <br />
      <br />
      <Link href='/session'>check session</Link>
    </div>
  );
}
