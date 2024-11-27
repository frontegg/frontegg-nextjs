export const fronteggPathRewrite = [
  {
    patternStr: '^/api/',
    replaceStr: '/',
  },
];
export const fronteggSSOPathRewrite = [
  {
    patternStr: '/frontegg/saml/callback$',
    replaceStr: '/auth/saml/callback',
  },
];

export const defaultFronteggHeaders = [
  'Content-Type',
  'Authorization',
  'x-frontegg-framework',
  'x-frontegg-sdk',
  'frontegg-source',
  'frontegg-requested-application-id',
];
