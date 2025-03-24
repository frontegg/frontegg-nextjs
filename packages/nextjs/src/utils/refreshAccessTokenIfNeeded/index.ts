import type { NextPageContext } from 'next/dist/shared/lib/utils';
import type { FronteggNextJSSession } from '../../types';
import { createSessionFromAccessToken } from '../../common';
import config from '../../config';
import CookieManager from '../cookies';
import {
  isOauthCallback,
  hasSetSessionCookie,
  isRuntimeNextRequest,
  isSamlCallback,
  refreshAccessTokenEmbedded,
  refreshAccessTokenHostedLogin,
  saveForwardedSession,
  getForwardedSession,
} from './helpers';
import fronteggLogger from '../fronteggLogger';
import encryption from '../encryption';
import createSession from '../createSession';
import {
  FRONTEGG_HEADERS_VERIFIER_HEADER,
  FRONTEGG_FORWARD_IP_HEADER,
  getClientIp,
  FRONTEGG_VENDOR_ID_HEADER,
} from '../../api/utils';

export { isRuntimeNextRequest };
/**
 * Refreshes the access token for the current session.
 *
 * @param {NextPageContext} ctx - The Next.js Page Context object.
 * @returns {Promise<FronteggNextJSSession | null>} A Promise that resolves to the updated session object, or `null` if the refresh failed.
 */
export default async function refreshAccessTokenIfNeeded(ctx: NextPageContext): Promise<FronteggNextJSSession | null> {
  const logger = fronteggLogger.child({ tag: 'refreshAccessTokenIfNeeded' });

  logger.info(`Refreshing token by for PageContext ${ctx.pathname}`);
  const nextJsRequest = ctx.req;
  const nextJsResponse = ctx.res;
  const url = nextJsRequest?.url;
  if (!nextJsResponse || !nextJsRequest || !url) {
    logger.debug(`abandon refreshToken due to PageContext.req = null`);
    return null;
  }

  if (hasSetSessionCookie(nextJsResponse.getHeader('set-cookie'))) {
    const cookies = CookieManager.getSessionCookieFromRedirectedResponse(nextJsResponse);
    const session = await createSession(cookies, encryption);
    logger.debug('Abandon refreshToken due to a previous redirect to /_error or other server-side redirect.');
    return session ?? getForwardedSession(nextJsResponse);
  }

  try {
    logger.info(`Check if should request made from first application load`);

    if (isRuntimeNextRequest(url) || config.disableInitialPropsRefreshToken) {
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

    if (config.isHostedLogin) {
      // hosted login bypassed urls
      if (isOauthCallback(url)) {
        logger.debug(`abandon refreshToken for HostedLogin Callback ${url}`);
        CookieManager.removeCookies({
          isSecured: config.isSSL,
          cookieDomain: config.cookieDomain,
          res: nextJsResponse,
          req: nextJsRequest,
        });
      }
    } else {
      // embedded login bypassed urls
      if (isSamlCallback(url)) {
        logger.debug(`abandon refreshToken for Saml Callback ${url}`);
        return null;
      }
    }

    const clientIp =
      getClientIp(nextJsRequest.headers['cf-connecting-ip'] || nextJsRequest.headers['x-forwarded-for']) ||
      nextJsRequest.socket?.remoteAddress;

    if (clientIp && config.shouldForwardIp) {
      nextJsRequest.headers[FRONTEGG_FORWARD_IP_HEADER] = clientIp;
      nextJsRequest.headers[FRONTEGG_HEADERS_VERIFIER_HEADER] = config.sharedSecret ?? '';
      nextJsRequest.headers[FRONTEGG_VENDOR_ID_HEADER] = config.clientId;
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

    const cookieHeader: string[] =
      // @ts-ignore the first argument "raw" will only work before nextjs 13.4 and the second argument "getSetCookie" will only work after
      response.headers?.raw?.()['set-cookie'] ??
      // @ts-ignore the first argument "raw" will only work before nextjs 13.4 and the second argument "getSetCookie" will only work after
      response.headers?.getSetCookie?.() ??
      response.headers?.get?.('set-cookie') ??
      [];

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
    nextJsResponse.setHeader('set-cookie', newSetCookie);

    const fronteggSession = {
      accessToken: data.accessToken ?? data.access_token,
      user: decodedJwt,
      refreshToken,
    };

    saveForwardedSession(nextJsResponse, fronteggSession);
    return fronteggSession;
  } catch (e) {
    logger.error('[refreshToken] Failed to create session e', e);
    return null;
  }
}
