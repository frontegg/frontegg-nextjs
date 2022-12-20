const envError = (varName: string) => `@frontegg/nextjs: .env.local must contain ${varName}`;

export const fronteggErrors = {
  envAppUrl: envError('FRONTEGG_APP_URL'),
  envBaseUrl: envError('FRONTEGG_BASE_URL'),
  envClientId: envError('FRONTEGG_CLIENT_ID'),
};
