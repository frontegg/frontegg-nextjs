import { AdminPortal } from '@frontegg/nextjs';

export default function NoSsr() {
  return (
    <div>
      <h1>NO SSR Session</h1>
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
}

export const getStaticProps = () => ({ props: {} });
