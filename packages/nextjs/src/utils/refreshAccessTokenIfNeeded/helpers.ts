import fronteggLogger from '../fronteggLogger';
import CookieManager from '../cookies';
import { NextApiRequest } from 'next/dist/shared/lib/utils';
import api from '../../api';
import { getTokensFromCookie } from '../../common';
import { IncomingMessage } from 'http';
import config from '../../config';

import { FRONTEGG_FORWARDED_SESSION_KEY } from '../common/constants';
import { FronteggNextJSSession } from '../../types';

export function hasRefreshTokenCookie(cookies: Record<string, any>): boolean {
  if (cookies == null) {
    return false;
  }
  const logger = fronteggLogger.child({ tag: 'refreshToken.hasRefreshTokenCookie' });
  const refreshTokenKey = CookieManager.refreshTokenKey;
  logger.debug(`Checking if '${refreshTokenKey}' exists in cookies`);
  const cookieKey = Object.keys(cookies).find((cookie) => {
    return cookie.replace(/-/g, '') === refreshTokenKey;
  });
  const exists: boolean = cookieKey != null;
  logger.debug(`Cookie '${refreshTokenKey}' ${exists ? 'exists' : 'NOT exists'} in cookies`);
  return exists;
}

export async function refreshAccessTokenEmbedded(request: IncomingMessage): Promise<Response | null> {
  const logger = fronteggLogger.child({ tag: 'refreshToken.refreshAccessTokenEmbedded' });

  const headers = request.headers as Record<string, string>;
  const cookies = (request as NextApiRequest).cookies;

  logger.info('check if has refresh token headers');
  if (hasRefreshTokenCookie(cookies)) {
    logger.info('going to refresh token (embedded mode)');
    if (config.appId) {
      headers['frontegg-requested-application-id'] = config.appId;
    }
    return await api.refreshTokenEmbedded(headers);
  }
  return null;
}

export async function refreshAccessTokenHostedLogin(request: IncomingMessage): Promise<Response | null> {
  const logger = fronteggLogger.child({ tag: 'refreshToken.refreshAccessTokenHostedLogin' });
  const headers = request.headers as Record<string, string>;

  logger.info('trying to get token from cookies');

  const sealFromCookies = CookieManager.getSessionCookieFromRequest(request);
  try {
    const tokens = await getTokensFromCookie(sealFromCookies);
    if (!tokens?.refreshToken) {
      logger.info('refresh token not found');
      return null;
    }
    if (config.appId) {
      headers['frontegg-requested-application-id'] = config.appId;
    }
    if (config.secureJwtEnabled) {
      const clientId = config.clientId;
      const clientSecret = config.clientSecret;

      logger.info('going to refresh token (hosted-login mode) (secure-jwt mode)');
      return await api.refreshTokenHostedLogin(headers, tokens.refreshToken, clientId, clientSecret);
    } else {
      logger.info('going to refresh token (hosted-login mode) ', tokens.refreshToken);
      return await api.refreshTokenHostedLogin(headers, tokens.refreshToken);
    }
  } catch (e) {
    logger.error(e);
    return null;
  }
}

/**
 * If url starts with /_next/ means that the user trying to navigate
 * to a new nextjs page, in this scenario no need to refresh token
 * we can just return the actual stateless session from
 * the encrypted cookie
 */
export function isRuntimeNextRequest(url: string): boolean {
  return url.startsWith('/_next/');
}

/**
 * If url starts with '/oauth/callback' means that the user navigated back
 * from frontegg hosted login, in this scenario no need to SSR refresh token
 */
export function isOauthCallback(url: string): boolean {
  return url.startsWith('/oauth/callback');
}

/**
 * If url starts with '/account/saml/callback' means that the user navigated back
 * from sso login, in this scenario no need to SSR refresh token
 */
export function isSamlCallback(url: string): boolean {
  return url.startsWith('/account/saml/callback') || url.startsWith('/account/oidc/callback');
}

/**
 * If the url equals to '/frontegg/auth/{provider}/callback', it means that the SSO provider
 * is posting an http request to the nextjs backend middleware after successfully logged in the user
 */
export function isSSOPostRequest(url: string): boolean {
  return url === '/frontegg/auth/saml/callback' || url === '/frontegg/auth/oidc/callback';
}

/**
 * This function verifies if the headers includes a 'set-cookie' header
 * from a prior refresh token request. If it's the case, we can infer that the
 * session cookie has been initialized, thus we can disable the double refresh token
 * for server-side redirects such as '/_error' or any other server-side redirects.
 */
export function hasSetSessionCookie(cookieHeader: number | string | string[] | undefined): boolean {
  if (!cookieHeader || typeof cookieHeader === 'number') {
    return false;
  }
  const cookieName = config.cookieName;
  if (typeof cookieHeader === 'string') {
    return cookieHeader.indexOf(cookieName) !== -1;
  }
  if (Array.isArray(cookieHeader)) {
    return cookieHeader.some((header) => header.startsWith(cookieName));
  }
  return false;
}

/**
 * This function stores the Frontegg session instance for use
 * within the Next.js application during the token refresh process
 * in the redirect request page.
 */
export function saveForwardedSession(holder: any, session: FronteggNextJSSession | undefined) {
  holder[FRONTEGG_FORWARDED_SESSION_KEY] = session;
}

/**
 * This function retrieves the stored session from the previous redirected page request.
 * This helps in preventing the token from being refreshed twice during a single client page request.
 */

export function getForwardedSession(holder: any): FronteggNextJSSession | null {
  return holder[FRONTEGG_FORWARDED_SESSION_KEY];
}
