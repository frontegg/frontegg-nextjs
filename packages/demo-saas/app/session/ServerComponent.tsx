import { getUserSession, getUserTokens } from '@frontegg/nextjs/server';

export const ServerSession = async () => {
  const userSession = await getUserSession();
  const tokens = await getUserTokens();
  return (
    <div>
      <div>user session server side: {JSON.stringify(userSession)}</div>;
      <div>user tokens server side: {JSON.stringify(tokens)}</div>
    </div>
  );
};
