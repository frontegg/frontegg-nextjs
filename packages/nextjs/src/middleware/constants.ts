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

export const headersToRemove = [
  'x-invoke-path',
  'x-invoke-query',
  'x-middleware-invoke',
  'x-middleware-next',
  'transfer-encoding',
  'cache-control',
  'content-security-policy',
  'x-content-security-policy',
  'permissions-policy',
  'feature-policy',
  'l5d-client-id',
  'x-webkit-csp',
];
