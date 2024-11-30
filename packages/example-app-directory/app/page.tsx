import Link from 'next/link';
import { UserState } from './UserState';

export default function MainPage() {
  return (
    <div>
      <h3>Next JS application with frontegg</h3>
      <br />
      <br />
      <UserState />
      <br />
      <br />
      <Link href='/session'>check session</Link>
      <br />
      <br />
      <Link href='/no-ssr'>Go to SSG page</Link>

      <br />
      <Link href='/account/logout'>logout embedded</Link>
      <br />
    </div>
  );
}
