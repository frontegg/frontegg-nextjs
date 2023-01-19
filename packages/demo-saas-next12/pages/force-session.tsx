import { GetServerSideProps } from 'next';
import { AdminPortal, useAuthUserOrNull, getServerSidePropsWithFrontegg, withFronteggPage } from '@frontegg/nextjs';

export default withFronteggPage(function ForceSession({ session }: any) {
  const user = useAuthUserOrNull();
  console.log(user);

  return (
    <div>
      <h1>Force SSR Session</h1>
      <br />
      hooks: {JSON.stringify(user)}
      <br />
      SSR Session: {session ? JSON.stringify(session) : 'No Session'}
      <br />
      <br />
      <br />
      <button
        onClick={() => {
          AdminPortal.show();
        }}
      >
        Open AdminPortal
      </button>
    </div>
  );
});

export { getFronteggProtectedServerSideProps as getServerSideProps } from '@frontegg/nextjs';
