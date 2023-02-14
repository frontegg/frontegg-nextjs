import { fronteggRefreshTokenUrl } from '@frontegg/rest-api';

export const ApiUrls = {
  WellKnown: {
    jwks: `/.well-known/jwks.json`,
  },
  refreshToken: {
    embedded: `/frontegg/${fronteggRefreshTokenUrl}`,
    hosted: `/frontegg/oauth/token`,
  },
};
