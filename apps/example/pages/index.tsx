import { GetServerSideProps } from 'next';
import { AdminPortal, getSession } from '@frontegg/nextjs';

export default function MyPage() {
  return (
    <div>
      <h1>Welcome to NextJS with Frontegg</h1>
      <button data-test-id="open-admin-portal-btn" onClick={() => AdminPortal.show()}>Open Admin Portal</button>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context.req);
  if (session) {
    const { data } = await fetch('{external}/product', {
      headers: {
        Authorization: 'bearer ' + session.accessToken,
      },
    });
    return { props: { products: data } };
  }
  return { props: { products: [] } };
};
