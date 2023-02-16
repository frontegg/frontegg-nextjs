import fronteggLogger from '../fronteggLogger';
import CookieManager from '../cookies';
import { NextApiRequest } from 'next/dist/shared/lib/utils';
import api from '../../api';
import { getTokensFromCookie } from '../../common';
import { IncomingMessage } from 'http';

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

    logger.info('going to refresh token (hosted-login mode)');
    return await api.refreshTokenHostedLogin(headers, tokens.refreshToken);
  } catch (e) {
    console.error('refreshTokenHostedLogin', e);
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
 * from frontegg hosted login, in this scenario no need to refresh token
 */
export function isOauthCallback(url: string): boolean {
  return url.startsWith('/oauth/callback');
}
