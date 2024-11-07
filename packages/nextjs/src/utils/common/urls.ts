import { fronteggRefreshTokenUrl } from '@frontegg/rest-api';

export const CommonUrls = {
  WellKnown: {
    jwks: `/.well-known/jwks.json`,
  },
  refreshToken: {
    embedded: `/frontegg${fronteggRefreshTokenUrl}`,
    hosted: `/frontegg/oauth/token`,
  },
  activateAccount: {
    activate: '/frontegg/identity/resources/users/v1/activate',
  },
  logout: '/logout',
};
