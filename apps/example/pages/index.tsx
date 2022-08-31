import { GetServerSideProps } from 'next';
import { AdminPortal } from '@frontegg/nextjs';

export default function MyPage() {
  return (
    <div>
      <h1>Welcome to NextJS with Frontegg</h1>
      <button data-test-id="open-admin-portal-btn" onClick={() => AdminPortal.show()}>Open Admin Portal</button>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: { products: [] } };
};
