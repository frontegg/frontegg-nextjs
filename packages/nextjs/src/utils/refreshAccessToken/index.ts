import type { NextPageContext } from 'next/dist/shared/lib/utils';
import type { FronteggNextJSSession } from '../../types';
import { createSessionFromAccessToken } from '../../common';
import config from '../../config';
import CookieManager from '../cookies';
import {
  isOauthCallback,
  isRuntimeNextRequest,
  isSamlCallback,
  refreshAccessTokenEmbedded,
  refreshAccessTokenHostedLogin,
} from './helpers';
import fronteggLogger from '../fronteggLogger';
import encryption from '../encryption';
import createSession from '../createSession';

/**
 * Refreshes the access token for the current session.
 *
 * @param {NextPageContext} ctx - The Next.js Page Context object.
 * @returns {Promise<FronteggNextJSSession | null>} A Promise that resolves to the updated session object, or `null` if the refresh failed.
 */
export default async function refreshAccessToken(ctx: NextPageContext): Promise<FronteggNextJSSession | null> {
  const logger = fronteggLogger.child({ tag: 'refreshAccessToken' });
  logger.info(`Refreshing token by for PageContext ${ctx.pathname}`);
  const nextJsRequest = ctx.req;
  const nextJsResponse = ctx.res;
  const url = nextJsRequest?.url;
  if (!nextJsResponse || !nextJsRequest || !url) {
    logger.debug(`abandon refreshToken due to PageContext.req = null`);
    return null;
  }

  try {
    logger.info(`Check if should request made from first application load`);

    if (isRuntimeNextRequest(url)) {
      logger.debug(`Detect runtime next.js request, resolving existing session from cookies if exists`);

      const cookies = CookieManager.getSessionCookieFromRequest(nextJsRequest);
      const session = await createSession(cookies, encryption);

      if (session) {
        logger.debug(`session resolved from session cookie`);
        return session;
      } else {
        logger.info('Failed to resolve session from cookie, going to refresh token');
      }
    }

    if (isOauthCallback(url) || isSamlCallback(url)) {
      /* Prevent refresh token due to oauth login callback */
      logger.debug(`abandon refreshToken for url='/oauth/callback'`);
      return null;
    }

    let response: Response | null;
    if (config.isHostedLogin) {
      response = await refreshAccessTokenHostedLogin(nextJsRequest);
    } else {
      response = await refreshAccessTokenEmbedded(nextJsRequest);
    }

    const isSecured = config.isSSL;
    if (response === null || !response.ok) {
      CookieManager.removeCookies({
        cookieDomain: config.cookieDomain,
        isSecured,
        req: nextJsRequest,
        res: nextJsResponse,
      });
      return null;
    }

    const data = await response.json();

    // @ts-ignore the first argument "raw" will only work before nextjs 13.4 and the second argument "getSetCookie" will only work after
    const cookieHeader: string[] = response.headers?.raw?.()['set-cookie'] ?? response.headers?.getSetCookie?.() ?? [];
    const newSetCookie = CookieManager.modifySetCookie(cookieHeader, isSecured) ?? [];

    const [session, decodedJwt, refreshToken] = await createSessionFromAccessToken(data);

    if (!session) {
      return null;
    }
    const cookieValue = CookieManager.create({
      value: session,
      expires: new Date(decodedJwt.exp * 1000),
      secure: isSecured,
      req: nextJsRequest,
    });
    newSetCookie.push(...cookieValue);
    ctx.res?.setHeader('set-cookie', newSetCookie);

    return {
      accessToken: data.accessToken ?? data.access_token,
      user: decodedJwt,
      refreshToken,
    };
  } catch (e) {
    logger.error('[refreshToken] Failed to create session e', e);
    return null;
  }
}
