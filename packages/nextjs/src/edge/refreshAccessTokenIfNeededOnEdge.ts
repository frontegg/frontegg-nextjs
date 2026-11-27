import { FronteggEdgeSession } from '../types';
import type { IncomingMessage } from 'http';
import CookieManager from '../utils/cookies';
import config from '../config';
import api from '../api';
import fronteggLogger from '../utils/fronteggLogger';
import JwtManager from '../utils/jwt';
import encryptionEdge from '../utils/encryption-edge';
import { isRefreshRejected } from '../utils/common/refreshResponse';

const logger = fronteggLogger.child({ tag: 'EdgeRuntime.refreshAccessTokenIfNeededOnEdge' });

export async function refreshAccessTokenIfNeededOnEdge(
  req: IncomingMessage | Request
): Promise<FronteggEdgeSession | undefined> {
  const refreshCookie = CookieManager.getRefreshCookieFromRequestEdge(req);
  if (!refreshCookie) {
    logger.info('No refresh cookie found, No session found');
    return undefined;
  }

  logger.info('going to refresh token');

  const reqHeaders = req.headers as any as Map<string, string>;
  const headers: Record<string, string> = {};
  reqHeaders.forEach((value: string, key: string) => {
    headers[key] = value;
  });
  const clientId = config.clientId;
  const clientSecret = config.clientSecret;

  let response: Response | null;
  try {
    if (config.isHostedLogin) {
      response = await api.refreshTokenHostedLogin(headers, refreshCookie, clientId, clientSecret);
    } else {
      response = await api.refreshTokenEmbedded(headers);
    }
  } catch (e) {
    logger.error('Failed to refresh token', e);
    return undefined;
  }

  const isSecured = config.isSSL;
  if (response === null || !response.ok) {
    if (!isRefreshRejected(response)) {
      logger.warn(`Token refresh failed (status ${response?.status ?? 'none'}), keeping the session cookies`);
      return undefined;
    }
    const cookiesToRemove = CookieManager.getRequestCookiesHeaderToRemove({
      cookieDomain: config.cookieDomain,
      isSecured,
      req,
    });
    if (cookiesToRemove) {
      return {
        session: undefined,
        headers: {
          'set-cookie': cookiesToRemove.join(', '),
        },
      };
    }
    return undefined;
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
  const [session, decodedJwt, refreshToken] = await createSessionFromAccessTokenOnEdge(data);

  if (!session) {
    return {
      session: undefined,
      headers: {
        'set-cookie': newSetCookie.join(', '),
      },
    };
  }

  const cookieValue = CookieManager.create({
    value: session,
    expires: new Date(decodedJwt.exp * 1000),
    secure: isSecured,
    req,
  });
  newSetCookie.push(...cookieValue);

  const forwardedHeaders = req.headers as Headers;
  forwardedHeaders.set('cookie', mergeSetCookiesIntoCookieHeader(forwardedHeaders.get('cookie'), newSetCookie));
  return {
    session: {
      accessToken: data.accessToken ?? data.access_token,
      user: decodedJwt,
      refreshToken,
    },
    headers: {
      'set-cookie': newSetCookie.join(', '),
    },
    forwardedHeaders,
  };
}

function splitNameValue(pair: string): [string, string] {
  const separatorIndex = pair.indexOf('=');
  if (separatorIndex === -1) {
    return [pair.trim(), ''];
  }
  return [pair.slice(0, separatorIndex).trim(), pair.slice(separatorIndex + 1).trim()];
}

/** Request cookies with each set-cookie applied: new values replace old ones and empty values remove the cookie. */
export function mergeSetCookiesIntoCookieHeader(cookieHeader: string | null, setCookies: string[]): string {
  const requestCookies: [string, string][] = (cookieHeader ?? '')
    .split(';')
    .filter((pair) => pair.trim() !== '')
    .map(splitNameValue);

  const merged = setCookies.reduce((cookies, setCookie) => {
    const [name, value] = splitNameValue(setCookie.split(';')[0]);
    if (value === '') {
      cookies.delete(name);
    } else {
      cookies.set(name, value);
    }
    return cookies;
  }, new Map<string, string>(requestCookies));

  return Array.from(merged, ([name, value]) => `${name}=${value}`).join('; ');
}

export async function createSessionFromAccessTokenOnEdge(data: any): Promise<[string, any, string] | []> {
  const accessToken = data.accessToken ?? data.access_token;
  const refreshToken = data.refreshToken ?? data.refresh_token;
  const { payload: decodedJwt }: any = await JwtManager.verify(accessToken);
  decodedJwt.expiresIn = Math.floor((decodedJwt.exp * 1000 - Date.now()) / 1000);

  const tokens = { accessToken, refreshToken };
  const session = await encryptionEdge.sealTokens(tokens, decodedJwt.exp);
  return [session, decodedJwt, refreshToken];
}
