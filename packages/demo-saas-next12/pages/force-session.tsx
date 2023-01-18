import { GetServerSideProps } from 'next';
import { AdminPortal, useAuthUserOrNull, getServerSidePropsWithFrontegg, withFronteggPage } from '@frontegg/nextjs';

export default withFronteggPage(function ForceSession({ session, hello }: any) {
  const user = useAuthUserOrNull();
  console.log(hello);

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

export const getServerSideProps: GetServerSideProps = getServerSidePropsWithFrontegg(
  (context) => {
    return { props: { hello: 'yes' } };
  },
  { isProtectedRoute: false }
);
