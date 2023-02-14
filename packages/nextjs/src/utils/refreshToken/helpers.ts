import fronteggLogger from '../fronteggLogger';
import CookieManager from '../cookies';
import { NextPageContext } from 'next/dist/shared/lib/utils';
import api from '../../api';
import { getTokensFromCookie } from '../../common';

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

export async function sendRefreshTokenEmbedded(
  ctx: NextPageContext,
  headers: Record<string, string>,
  cookies: Record<string, any>
): Promise<Response | null> {
  const logger = fronteggLogger.child({ tag: 'refreshToken.refreshTokenEmbedded' });
  logger.info('check if has refresh token headers');
  if (hasRefreshTokenCookie(cookies)) {
    logger.info('going to refresh token (embedded mode)');
    return await api.refreshTokenEmbedded(headers);
  }
  return null;
}

export async function sendRefreshTokenHostedLogin(
  ctx: NextPageContext,
  headers: Record<string, string>
): Promise<Response | null> {
  try {
    const sealFromCookies = CookieManager.getSessionCookieFromRequest(ctx?.req);
    const tokens = await getTokensFromCookie(sealFromCookies);
    if (!tokens?.refreshToken) {
      return null;
    }
    return await api.refreshTokenHostedLogin(headers, tokens.refreshToken);
  } catch (e) {
    console.error('refreshTokenHostedLogin', e);
    return null;
  }
}

/**
 * If url starts with /_next/ header exist means that the user trying to navigate
 * to a new nextjs page, in this scenario no need to refresh toke
 * we can just return the actual stateless session from
 * the encrypted cookie
 */
export function isRuntimeNextRequest(url:string):boolean {
  return url.startsWith('/_next/');
}
