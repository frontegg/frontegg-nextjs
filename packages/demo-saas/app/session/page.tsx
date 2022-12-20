import { UserSession } from './ClientComponent';
import { ServerSession } from './ServerComponent';
import Link from 'next/link';

export default async function SessionPage() {
  return (
    <div>
      <h1>This page is part of beta app dir</h1>
      {/* @ts-ignore */}
      <ServerSession />;
      <UserSession />
      <br />
      <br />
      <Link href='/'>home</Link>
    </div>
  );
}
