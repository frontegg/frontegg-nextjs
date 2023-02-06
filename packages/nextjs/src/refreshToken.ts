import { fronteggRefreshTokenUrl } from '@frontegg/rest-api';
import { NextApiRequest, NextPageContext } from 'next/dist/shared/lib/utils';
import {
  FronteggNextJSSession,
  createSessionFromAccessToken,
  getTokensFromCookie,
  CookieManager,
  FronteggUserTokens,
  RequestType,
  createGetSession,
} from './common';
import nextjsPkg from 'next/package.json';
import sdkVersion from './sdkVersion';
import { unsealData } from 'iron-session';
import FronteggConfig from './common/FronteggConfig';

async function getTokensFromCookieOnEdge(cookie: string): Promise<FronteggUserTokens | undefined> {
  const jwt: string = await unsealData(cookie, {
    password: FronteggConfig.passwordsAsMap,
  });
  return JSON.parse(jwt);
}

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
    return await fetch(`${process.env['FRONTEGG_BASE_URL']}/frontegg/oauth/token`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
      }),
      headers: {
        'accept-encoding': headers['accept-encoding'],
        'accept-language': headers['accept-language'],
        accept: headers['accept'],
        'content-type': 'application/json',
        origin: headers['origin'],
        'user-agent': headers['user-agent'],
        connection: headers['connection'],
        'cache-control': headers['cache-control'],
        'x-frontegg-framework': `next@${nextjsPkg.version}`,
        'x-frontegg-sdk': `@frontegg/nextjs@${sdkVersion.version}`,
      },
    });
  } catch (e) {
    console.error('refreshTokenHostedLogin', e);
    return null;
  }
}

async function refreshTokenEmbedded(
  ctx: NextPageContext,
  headers: Record<string, string>,
  cookies: Record<string, any>
): Promise<Response | null> {
  const refreshTokenKey = `fe_refresh_${FronteggConfig.clientId}`.replace(/-/g, '');
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

    /**
     * If referer header exist means that the user trying to navigate
     * to a new nextjs page, in this scenario no need to refresh toke
     * we can just return the actual stateless session from
     * the encrypted cookie
     */
    if (request.headers.referer) {
      try {
        const session = await createGetSession({
          getCookie: () => CookieManager.getParsedCookieFromRequest(request),
          cookieResolver: getTokensFromCookieOnEdge,
        });
        if (session) {
          return session;
        }
      } catch (e) {
        console.log('no nextjs session, will refresh token');
      }
    }

    const isSecured = new URL(FronteggConfig.appUrl).protocol === 'https:';
    const headers = request.headers as Record<string, string>;
    const cookies = (request as NextApiRequest).cookies;

    if (ctx.req!.url!.startsWith('/oauth/callback')) {
      return null;
    }
    let response: Response | null;
    if (FronteggConfig.fronteggAppOptions.hostedLoginBox) {
      response = await refreshTokenHostedLogin(ctx, headers);
    } else {
      response = await refreshTokenEmbedded(ctx, headers, cookies);
    }

    if (response === null || !response.ok) {
      CookieManager.removeCookies({
        isSecured,
        cookieDomain: FronteggConfig.cookieDomain,
        res: ctx.res!,
        req: ctx.req,
      });
      return null;
    }

    const data = await response.json();

    // @ts-ignore
    const cookieHeader = response.headers.raw()['set-cookie'];
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
    newSetCookie.push(...cookieValue);
    ctx.res?.setHeader('set-cookie', newSetCookie);

    return {
      accessToken: data.accessToken ?? data.access_token,
      user: decodedJwt,
      refreshToken,
    };
  } catch (e) {
    console.error('Failed to create session e', e);
    return null;
  }
}
