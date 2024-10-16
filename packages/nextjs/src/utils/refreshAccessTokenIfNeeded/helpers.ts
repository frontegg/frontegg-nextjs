import fronteggLogger from '../fronteggLogger';
import CookieManager from '../cookies';
import { NextApiRequest } from 'next/dist/shared/lib/utils';
import api from '../../api';
import { getTokensFromCookie } from '../../common';
import { IncomingMessage } from 'http';
import config from '../../config';
import { ApiUrls } from '../../api/urls';

export function hasRefreshTokenCookie(cookies: Record<string, any>): boolean {
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
 * Checks if the request URL is a refresh token request.
 * This is used to determine if the current request is targeting
 * one of the predefined refresh token URLs (embedded or hosted modes).
 */
export function isRefreshTokenRequest(url: string): boolean {
  const refreshTokenUrls = [ApiUrls.refreshToken.embedded, ApiUrls.refreshToken.hosted];
  return refreshTokenUrls.includes(url);
}
