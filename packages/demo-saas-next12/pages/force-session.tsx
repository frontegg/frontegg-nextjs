import { AdminPortal, useAuthUserOrNull, withFronteggPage } from '@frontegg/nextjs';

export default withFronteggPage(function ForceSession({ pageProps: { session } }) {
  const user = useAuthUserOrNull();

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
