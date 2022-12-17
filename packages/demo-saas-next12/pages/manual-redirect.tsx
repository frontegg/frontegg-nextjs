import { GetServerSideProps } from 'next';
import { getSession } from '@frontegg/nextjs';

export default function ManualRedirect({ ssrSession }) {
  return (
    <div>
      <h1>Manual Server-Side session redirect</h1>
      <br />
      SSR Session: {ssrSession ? JSON.stringify(ssrSession) : 'No Session'}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context.req);
  if (session) {
    return { props: { ssrSession: session } };
  }

  return {
    redirect: {
      permanent: false,
      destination: `/account/login?redirectUrl=${encodeURIComponent(context.req.url ?? '')}`,
    },
  };
};
