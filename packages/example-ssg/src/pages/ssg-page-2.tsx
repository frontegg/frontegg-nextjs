import { AdminPortal, useAuth } from '@frontegg/nextjs';
import Link from 'next/link';

export default function SsgPage1() {
  const { user } = useAuth();

  /**
   * refreshingToken is true when the token is being refreshed.
   * this will be added to the useAuth hook in the next release.
   *
   * Then you can use it to display a loading spinner or something like that,
   * while the token is being refreshed on component mounts.
   */
  // const { user, refreshingToken } = useAuth();

  return (
    <div style={{ background: '#dcc2f8', padding: '16px', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '32px' }}>SSG Page 2</h1>
      {user ? <div>Logged in as: {user.email}</div> : <div>SSG not authorized</div>}
      <br/>
      <br/>
      <Link href="/ssg-page-1">
        <button>Go to SSG page 1</button>
      </Link>
      <br/>
      <Link href="/">
        <button>Go home page (SSR)</button>
      </Link>
      <br/>
      <br/>
      <button
        onClick={() => {
          AdminPortal.show();
        }}
      >
        Open AdminPortal
      </button>
    </div>
  );
}

export const getStaticProps = () => ({ props: {} });
