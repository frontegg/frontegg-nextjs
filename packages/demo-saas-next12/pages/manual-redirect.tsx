import { GetServerSideProps } from 'next';
import { getSession, getServerSidePropsWithFrontegg } from '@frontegg/nextjs';

export default function ManualRedirect({ session, test }) {
  console.log(test);

  return (
    <div>
      <h1>Manual Server-Side session redirect</h1>
      <br />
      SSR Session: {session ? JSON.stringify(session) : 'No Session'}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = getServerSidePropsWithFrontegg(
  async (context) => {
    const session = await getSession(context.req);
    if (session) {
      return { props: { session, test: 'pass' } };
    }

    return {
      redirect: {
        permanent: false,
        destination: `/account/login?redirectUrl=${encodeURIComponent(context.req.url ?? '')}`,
      },
    };
  },
  { isProtectedRoute: false }
);
