export default function ManualRedirect({ session }) {
  return (
    <div>
      <h1>Manual Server-Side session redirect</h1>
      <br />
      SSR Session: {session ? JSON.stringify(session) : 'No Session'}
    </div>
  );
}

export { getFronteggProtectedServerSideProps as getServerSideProps } from '@frontegg/nextjs';
