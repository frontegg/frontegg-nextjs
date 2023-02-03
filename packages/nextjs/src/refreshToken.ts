import { fronteggRefreshTokenUrl, fronteggSilentRefreshTokenUrl } from '@frontegg/rest-api';
import { NextApiRequest, NextPageContext } from 'next/dist/shared/lib/utils';
import { createSessionFromAccessToken, getTokensFromCookie, CookieManager } from './common';
import fronteggConfig from './common/FronteggConfig';
import { FronteggNextJSSession } from './common/types';
import nextjsPkg from 'next/package.json';
import sdkVersion from './sdkVersion';

async function refreshTokenHostedLogin(
  ctx: NextPageContext,
  headers: Record<string, string>
): Promise<Response | null> {
  try {
    const sealFromCookies = CookieManager.getParsedCookieFromRequest(ctx?.req);
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
        'x-frontegg-framework': `next@${nextjsPkg.version}`,
        'x-frontegg-sdk': `@frontegg/nextjs@${sdkVersion.version}`,
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
      'x-frontegg-framework': `next@${nextjsPkg.version}`,
      'x-frontegg-sdk': `@frontegg/nextjs@${sdkVersion.version}`,
    },
  });
}

export async function refreshToken(ctx: NextPageContext): Promise<FronteggNextJSSession | null> {
  try {
    const request = ctx.req;
    if (!request) {
      return null;
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

    if (response === null || !response.ok) {
      CookieManager.removeCookies({
        isSecured,
        cookieDomain: fronteggConfig.cookieDomain,
        res: ctx.res!,
        req: ctx.req,
      });
      return null;
    }

    const data = await response.json();

    const rewriteCookieDomainConfig = {
      [fronteggConfig.baseUrlHost]: fronteggConfig.cookieDomain,
    };
    // @ts-ignore
    const cookieHeader = response.headers.raw()['set-cookie'];
    // let newSetCookie = CookieManager.rewriteCookieProperty(cookieHeader, rewriteCookieDomainConfig, 'domain');
    const newSetCookie = CookieManager.modifySetCookie(cookieHeader, isSecured) ?? [];
    const [session, decodedJwt, refreshToken] = await createSessionFromAccessToken(data);

    if (!session) {
      return null;
    }
    const cookieValue = CookieManager.createCookie({
      value: session,
      expires: new Date(decodedJwt.exp * 1000),
      isSecured,
    });
    // if (typeof newSetCookie === 'string') {
    //   newSetCookie = [ newSetCookie ];
    // }
    newSetCookie.push(...cookieValue);
    ctx.res?.setHeader('set-cookie', newSetCookie);

    return {
      accessToken: data.accessToken,
      user: decodedJwt,
      refreshToken,
    };
  } catch (e) {
    console.error('Failed to create session e', e);
    return null;
  }
}
