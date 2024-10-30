import { AdminPortal, useAuth } from '@frontegg/nextjs';
import TestComponent from '../components/TestComponent';
import Link from 'next/link';

export default function NoSsr() {
  const { user, silentRefreshing = true } = useAuth() as any;

  return (
    <div>
      <h1>NO SSR Session</h1>

      {silentRefreshing && <h2>Loading..</h2>}
      <code>{/*<pre>{JSON.stringify({user}, null, 2)}</pre>*/}</code>
      {user ? <div>Logged in as: {user.email}</div> : <div>SSG not authorized</div>}
      <br />
      <TestComponent />
      <button
        onClick={() => {
          AdminPortal.show();
        }}
      >
        Open AdminPortal
      </button>

      <br />
      <br />
      <br />
      <Link href='/force-session'>Go to force session page</Link>
    </div>
  );
}

export const getStaticProps = () => ({ props: {} });
