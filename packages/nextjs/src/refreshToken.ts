import { fronteggRefreshTokenUrl, fronteggSilentRefreshTokenUrl } from '@frontegg/rest-api';
import { NextApiRequest, NextPageContext } from 'next/dist/shared/lib/utils';
import {
  createCookie,
  createSessionFromAccessToken,
  getCookieFromRequest,
  getTokensFromCookie,
  removeCookies,
  rewriteCookieProperty,
} from './common';
import fronteggConfig from './common/FronteggConfig';
import { FronteggNextJSSession } from './common/types';
import { getSession } from './session';

async function refreshTokenHostedLogin(
  ctx: NextPageContext,
  headers: Record<string, string>
): Promise<Response | null> {
  try {
    const sealFromCookies = getCookieFromRequest(ctx?.req);
    const tokens = await getTokensFromCookie(sealFromCookies);
    if (!tokens?.refreshToken) {
      return null;
    }
    return await fetch(`${process.env['FRONTEGG_BASE_URL']}/frontegg${fronteggSilentRefreshTokenUrl}`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
      }),
      headers: {
        'accept-encoding': headers['accept-encoding'],
        'accept-language': headers['accept-language'],
        cookie: headers['cookie'],
        accept: headers['accept'],
        'user-agent': headers['user-agent'],
        connection: headers['connection'],
        'cache-control': headers['cache-control'],
      },
    });
  } catch (e) {
    return null;
  }
}

async function refreshTokenEmbedded(
  ctx: NextPageContext,
  headers: Record<string, string>,
  cookies: Record<string, any>
): Promise<Response | null> {
  const refreshTokenKey = `fe_refresh_${fronteggConfig.clientId}`.replace(/-/g, '');
  const cookieKey = Object.keys(cookies).find((cookie) => {
    return cookie.replace(/-/g, '') === refreshTokenKey;
  });

  if (!cookieKey) {
    // ctx.res?.setHeader('set-cookie', removedCookies);
    // remove all fe_nextjs-session cookies
    return null;
  }

  return await fetch(`${process.env['FRONTEGG_BASE_URL']}/frontegg${fronteggRefreshTokenUrl}`, {
    method: 'POST',
    credentials: 'include',
    body: '{}',
    headers: {
      'accept-encoding': headers['accept-encoding'],
      'accept-language': headers['accept-language'],
      cookie: headers['cookie'],
      accept: headers['accept'],
      'user-agent': headers['user-agent'],
      connection: headers['connection'],
      'cache-control': headers['cache-control'],
    },
  });
}

export async function refreshToken(ctx: NextPageContext): Promise<FronteggNextJSSession | null> {
  try {
    const request = ctx.req;
    if (!request) {
      return null;
    }
    try {
      const session = await getSession(ctx.req as any);
      if (session) {
        return session;
      }
    } catch (e) {
      // ignore error catch
    }
    const isSecured = new URL(fronteggConfig.appUrl).protocol === 'https:';
    const headers = request.headers as Record<string, string>;
    const cookies = (request as NextApiRequest).cookies;

    if (ctx.req!.url!.startsWith('/oauth/callback')) {
      return null;
    }
    let response: Response | null;
    if (fronteggConfig.fronteggAppOptions.hostedLoginBox) {
      response = await refreshTokenHostedLogin(ctx, headers);
    } else {
      response = await refreshTokenEmbedded(ctx, headers, cookies);
    }
    if (!response) {
      removeCookies(fronteggConfig.cookieName, isSecured, fronteggConfig.cookieDomain, ctx.res!);
      return null;
    }

    if (response.ok) {
      const data = await response.text();
      const rewriteCookieDomainConfig = {
        [fronteggConfig.baseUrlHost]: fronteggConfig.cookieDomain,
      };
      // @ts-ignore
      const cookieHeader = response.headers.raw()['set-cookie'];
      let newSetCookie = rewriteCookieProperty(cookieHeader, rewriteCookieDomainConfig, 'domain');
      const [session, decodedJwt, refreshToken] = await createSessionFromAccessToken(data);
      if (!session) {
        return null;
      }
      const cookieValue = createCookie({ session, expires: new Date(decodedJwt.exp * 1000), isSecured });
      if (typeof newSetCookie === 'string') {
        newSetCookie = [newSetCookie];
      }
      newSetCookie.push(...cookieValue);
      ctx.res?.setHeader('set-cookie', newSetCookie);
      return {
        accessToken: JSON.parse(data).accessToken,
        user: decodedJwt,
        refreshToken,
      };
    } else {
      // remove all fe_nextjs-session cookies
      // ctx.res?.setHeader('set-cookie', removedCookies);
      return null;
    }
  } catch (e) {
    return null;
  }
}
