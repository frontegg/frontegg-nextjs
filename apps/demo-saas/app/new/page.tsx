import { getSessionFromCookies } from '@frontegg/nextjs/backend';
import { cookies } from 'next/headers';

export default async function NewPage(props) {
  const session = await getSessionFromCookies(cookies);

  return (
    <div>
      <h1>New Page</h1>
      <br />
      Session On Server Component: {JSON.stringify(session)}
      <br />
      <br />
      <br />
      {/* <button
        onClick={() => {
          AdminPortal.show();
        }}
      >
        Open AdminPortal
      </button> */}
    </div>
  );
}
