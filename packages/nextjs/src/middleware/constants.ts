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
