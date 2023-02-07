import Link from 'next/link';
import { useAuth, useLoginWithRedirect } from '@frontegg/nextjs';
import { useState } from 'react';

export function Index() {
  const { user, isAuthenticated } = useAuth();
  const loginWithRedirect = useLoginWithRedirect();
  const [state, setState] = useState({ userAgent: '', id: -1 });
  /*
   * Replace the elements below with your own.
   *
   * Note: The corresponding styles are in the ./index.css file.
   */
  return (
    <div>
      Next JS V12 application with frontegg
      <br />
      <br />
      <div>{isAuthenticated ? user?.email : 'not logged in'}</div>
      <br />
      <button
        onClick={() => {
          loginWithRedirect();
        }}
      >
        Hosted login
      </button>
      <br />
      <br />
      <button
        data-testid='test-middleware-button'
        onClick={() => {
          fetch('/api/frontegg/middleware-test', {
            method: 'POST',
          }).then((data) => {
            data.json().then((response) => {
              setState(response);
            });
          });
        }}
      >
        Test Middleware
      </button>
      <br />
      <input data-testid='test-middleware-useragent' readOnly value={state.userAgent} />
      <input data-testid='test-middleware-id' readOnly value={state.id} />
      <br />
      <br />
      <Link href='/force-session'>check force session</Link>
    </div>
  );
}

export default Index;
