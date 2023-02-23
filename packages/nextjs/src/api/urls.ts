import { fronteggAuthApiRoutes, fronteggRefreshTokenUrl } from '@frontegg/rest-api';
import config from '../config';

export const ApiUrls = {
  WellKnown: {
    jwks: `/.well-known/jwks.json`,
  },
  refreshToken: {
    embedded: `/frontegg/${fronteggRefreshTokenUrl}`,
    hosted: `/frontegg/oauth/token`,
  },
};

interface BuildRouteResult {
  asPath: string;
  asUrl: URL;
}

/**
 * Builds a login route with a redirect URL encoded as a query parameter.
 *
 *  @param {string} redirectUrl - The URL to redirect to after successful login.
 *  @returns {BuildRouteResult} An object containing the generated login route and URL.
 *
 *  @throws {TypeError} If redirectUrl is not a string.
 */
export function buildLoginRoute(redirectUrl: string): BuildRouteResult {
  const asPath = `/account/login?redirectUrl=${encodeURIComponent(redirectUrl)}`;
  const asUrl = new URL(asPath, config.appUrl);
  return {
    asPath,
    asUrl,
  };
}

/**
 * Builds a HostedLogin's logout route with a redirect URL encoded as a query parameter.
 *
 *  @param {string} redirectUrl - The URL to redirect to after successful login.
 *  @returns {BuildRouteResult} An object containing the generated login route and URL.
 *
 *  @throws {TypeError} If redirectUrl is not a string.
 */
export function buildLogoutRoute(redirectUrl: string): BuildRouteResult {
  const asPath = `/oauth/logout?post_logout_redirect_uri=${encodeURIComponent(redirectUrl)}`;
  const asUrl = new URL(asPath, config.baseUrl);
  return {
    asPath,
    asUrl,
  };
}
