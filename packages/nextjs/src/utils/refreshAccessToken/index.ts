import { NextApiRequest, NextPageContext } from 'next/dist/shared/lib/utils';
import { FronteggNextJSSession, createSessionFromAccessToken } from '../../common';
import config from '../../config';
import CookieManager from '../cookies';
import { isRuntimeNextRequest, refreshAccessTokenEmbedded, refreshAccessTokenHostedLogin } from './helpers';
import fronteggLogger from '../fronteggLogger';
import encryption from '../encryption';
import createSession from '../createSession';

export default async function refreshAccessToken(ctx: NextPageContext): Promise<FronteggNextJSSession | null> {
  const logger = fronteggLogger.child({ tag: 'refreshToken' });
  logger.info(`Refreshing token by for PageContext ${ctx.pathname}`);
  const request = ctx.req;
  const url = request?.url;
  if (!request || !url) {
    logger.debug(`abandon refreshToken due to PageContext.req = null`);
    return null;
  }

  try {
    logger.info(`Check if should request made from first application load`);

    if (isRuntimeNextRequest(url)) {
      logger.debug(`Detect runtime next.js request, resolving existing session from cookies if exists`);
      // const sessionFromCookies = createSessionFromCookieHeaders();
      try {
        const session = await createSession({
          getCookie: () => CookieManager.getSessionCookieFromRequest(request),
          cookieResolver: encryption.unsealTokens,
        });
        if (session) {
          logger.debug(`session resolved from session cookie`);
          return session;
        }
      } catch (e) {
        console.log('no NextJS session, will refresh token');
      }
    }

    const isSecured = new URL(config.appUrl).protocol === 'https:';
    const headers = request.headers as Record<string, string>;
    const cookies = (request as NextApiRequest).cookies;

    if (ctx.req!.url!.startsWith('/oauth/callback')) {
      return null;
    }

    let response: Response | null;
    if (config.fronteggAppOptions.hostedLoginBox) {
      response = await refreshAccessTokenHostedLogin(ctx, headers);
    } else {
      response = await refreshAccessTokenEmbedded(ctx, headers, cookies);
    }

    if (response === null || !response.ok) {
      CookieManager.removeCookies({
        isSecured,
        cookieDomain: config.cookieDomain,
        res: ctx.res!,
        req: ctx.req,
      });
      return null;
    }

    const data = await response.json();

    // @ts-ignore
    const cookieHeader = response.headers?.raw?.()['set-cookie'];
    const newSetCookie = CookieManager.modifySetCookie(cookieHeader, isSecured) ?? [];
    const [session, decodedJwt, refreshToken] = await createSessionFromAccessToken(data);

    if (!session) {
      return null;
    }
    const cookieValue = CookieManager.create({
      value: session,
      expires: new Date(decodedJwt.exp * 1000),
      secure: isSecured,
    });
    newSetCookie.push(...cookieValue);
    ctx.res?.setHeader('set-cookie', newSetCookie);

    return {
      accessToken: data.accessToken ?? data.access_token,
      user: decodedJwt,
      refreshToken,
    };
  } catch (e) {
    console.error('[refreshToken] Failed to create session e', e);
    return null;
  }
}

console.log('a');
