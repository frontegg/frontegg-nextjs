import { GetServerSideProps } from 'next';
import { AdminPortal, useAuthUserOrNull, withSSRSession } from '@frontegg/nextjs';
import { useContext } from 'react';
import {FronteggStoreContext} from '@frontegg/react-hooks'

export default function ForceSession({ ssrSession }) {
  const user = useAuthUserOrNull();
  const { store, storeState } = useContext(FronteggStoreContext);
  const isSSR = typeof window === 'undefined'
  // console.log('user', user, isSSR);

  return (
    <div>
      <h1>Force SSR Session</h1>
      <br/>
      hooks: {JSON.stringify(user)}
      <br/>
      SSR Session: {ssrSession ? JSON.stringify(ssrSession) : 'No Session'}
      <br/>
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

export const getServerSideProps: GetServerSideProps = withSSRSession(
  (context, session) => {
    return { props: { ssrSession: session } };
  }
);
