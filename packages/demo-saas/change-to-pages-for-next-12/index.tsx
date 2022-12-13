import Link from 'next/link';
import { useAuthUserOrNull, useLoginWithRedirect } from '@frontegg/nextjs';

export function Index() {
  const user = useAuthUserOrNull();
  const loginWithRedirect = useLoginWithRedirect();
  /*
   * Replace the elements below with your own.
   *
   * Note: The corresponding styles are in the ./index.css file.
   */
  return (
    <div>
      Next JS application with frontegg
      <br />
      <br />
      <div>{user?.email ?? 'not logged in'}</div>
      <br />
      <button
        onClick={() => {
          loginWithRedirect();
        }}
      >
        Hosted login
      </button>
      <br />
      <br />
      <Link href='/force-session'>check force session</Link>
    </div>
  );
}

export default Index;
