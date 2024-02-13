import { getAppSession } from '@frontegg/nextjs/app';

export const ServerComponent = async () => {
  // Use getAppSession to get the session server-side
  const session = await getAppSession();

  return <pre>{JSON.stringify(session, null, 2)}</pre>;
};
