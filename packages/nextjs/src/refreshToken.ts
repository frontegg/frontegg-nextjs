import { fronteggRefreshTokenUrl } from '@frontegg/rest-api';
import { NextApiRequest, NextPageContext } from 'next/dist/shared/lib/utils';
import { FronteggNextJSSession, createSessionFromAccessToken, getTokensFromCookie, CookieManager } from './common';
import nextjsPkg from 'next/package.json';
import sdkVersion from './sdkVersion';
import ConfigManager from './ConfigManager';
import { getSession } from './session';

// tokenRegExp and headerCharRegex have been lifted from
// https://github.com/nodejs/node/blob/main/lib/_http_common.js
/**
 * Matches if val contains an invalid field-vchar
 *  field-value    = *( field-content / obs-fold )
 *  field-content  = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 *  field-vchar    = VCHAR / obs-text
 */
const headerCharRegex = /[^\t\x20-\x7e\x80-\xff]/;

/**
 * NodeJS 18 start using undici as http request handler,
 * undici http request does not accept invalid headers
 * for more details see:
 * https://github.com/nodejs/undici/blob/2b260c997ad4efe4ed2064b264b4b546a59e7a67/lib/core/request.js#L282
 * @param headers
 */
function removeInvalidHeaders(headers: Record<string, string>) {
  const newHeaders = { ...headers };
  Object.keys(newHeaders).forEach((key: string) => {
    const val: any = headers[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      delete newHeaders[key];
    } else if (headerCharRegex.exec(val) !== null) {
      delete newHeaders[key];
    } else if (val === undefined || val === null) {
      delete newHeaders[key];
    } else if (key.length === 10 && key === 'connection') {
      delete newHeaders[key];
    }
  });
  return newHeaders;
}

async function refreshTokenHostedLogin(
  ctx: NextPageContext,
  headers: Record<string, string>
): Promise<Response | null> {
  try {
    const sealFromCookies = CookieManager.getSessionCookieFromRequest(ctx?.req);
    const tokens = await getTokensFromCookie(sealFromCookies);
    if (!tokens?.refreshToken) {
      return null;
    }
    return await fetch(`${ConfigManager.baseUrl}/frontegg/oauth/token`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
      }),
      headers: removeInvalidHeaders({
        'accept-encoding': headers['accept-encoding'],
        'accept-language': headers['accept-language'],
        accept: headers['accept'],
        'content-type': 'application/json',
        origin: ConfigManager.baseUrl,
        'user-agent': headers['user-agent'],
        'cache-control': headers['cache-control'],
        'x-frontegg-framework': `next@${nextjsPkg.version}`,
        'x-frontegg-sdk': `@frontegg/nextjs@${sdkVersion.version}`,
      }),
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
  const refreshTokenKey = `fe_refresh_${ConfigManager.clientId}`.replace(/-/g, '');
  const cookieKey = Object.keys(cookies).find((cookie) => {
    return cookie.replace(/-/g, '') === refreshTokenKey;
  });

  if (!cookieKey) {
    return null;
  }

  return await fetch(`${ConfigManager.baseUrl}/frontegg${fronteggRefreshTokenUrl}`, {
    method: 'POST',
    credentials: 'include',
    body: '{}',
    headers: removeInvalidHeaders({
      'accept-encoding': headers['accept-encoding'],
      'accept-language': headers['accept-language'],
      cookie: headers['cookie'],
      accept: headers['accept'],
      'content-type': 'application/json',
      origin: ConfigManager.baseUrl,
      'user-agent': headers['user-agent'],
      'cache-control': headers['cache-control'],
      'x-frontegg-framework': `next@${nextjsPkg.version}`,
      'x-frontegg-sdk': `@frontegg/nextjs@${sdkVersion.version}`,
    }),
  });
}

export async function refreshToken(ctx: NextPageContext): Promise<FronteggNextJSSession | null> {
  try {
    const request = ctx.req;
    if (!request) {
      return null;
    }

    /**
     * If url starts with /_next/ header exist means that the user trying to navigate
     * to a new nextjs page, in this scenario no need to refresh toke
     * we can just return the actual stateless session from
     * the encrypted cookie
     */
    if (request.url?.startsWith('/_next/')) {
      try {
        const session = await getSession(request);
        if (session) {
          return session;
        }
      } catch (e) {
        console.log('no NextJS session, will refresh token');
      }
    }

    const isSecured = new URL(ConfigManager.appUrl).protocol === 'https:';
    const headers = request.headers as Record<string, string>;
    const cookies = (request as NextApiRequest).cookies;

    if (ctx.req!.url!.startsWith('/oauth/callback')) {
      return null;
    }
    let response: Response | null;
    if (ConfigManager.fronteggAppOptions.hostedLoginBox) {
      response = await refreshTokenHostedLogin(ctx, headers);
    } else {
      response = await refreshTokenEmbedded(ctx, headers, cookies);
    }

    if (response === null || !response.ok) {
      CookieManager.removeCookies({
        isSecured,
        cookieDomain: ConfigManager.cookieDomain,
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
