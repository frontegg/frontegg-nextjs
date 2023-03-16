import { getAppUserSession, getAppUserTokens } from '@frontegg/nextjs/app';

export const ServerSession = async () => {
  const userSession = await getAppUserSession();
  const tokens = await getAppUserTokens();
  return (
    <div>
      <div>user session server side: {JSON.stringify(userSession)}</div>;
      <div>user tokens server side: {JSON.stringify(tokens)}</div>
    </div>
  );
};
