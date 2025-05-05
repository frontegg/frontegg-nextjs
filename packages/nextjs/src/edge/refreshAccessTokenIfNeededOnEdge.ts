import { FronteggEdgeSession } from '../types';
import type { IncomingMessage } from 'http';
import CookieManager from '../utils/cookies';
import config from '../config';
import api from '../api';
import fronteggLogger from '../utils/fronteggLogger';
import JwtManager from '../utils/jwt';
import encryptionEdge from '../utils/encryption-edge';
import { getCookieExpirationDate, getTtlInSeconds } from '../utils/cookies/helpers';

const logger = fronteggLogger.child({ tag: 'EdgeRuntime.refreshAccessTokenIfNeededOnEdge' });

export async function refreshAccessTokenIfNeededOnEdge(
  req: IncomingMessage | Request
): Promise<FronteggEdgeSession | undefined> {
  const sealFromCookies = CookieManager.getSessionCookieFromRequest(req);
  console.log('sealFromCookiesOnEdge', sealFromCookies);
  if (!sealFromCookies) {
    logger.info('no cookies found');
    return undefined;
  }
  const tokens = await encryptionEdge.unsealTokens(sealFromCookies);
  logger.info('tokens', tokens);

  if (!tokens?.refreshToken) {
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
      response = await api.refreshTokenHostedLogin(headers, tokens.refreshToken, clientId, clientSecret);
    } else {
      response = await api.refreshTokenEmbedded(headers);
    }
  } catch (e) {
    logger.error('Failed to refresh token', e);
    return undefined;
  }
  logger.info('response:::::::::', response);
  const isSecured = config.isSSL;
  if (response === null || !response.ok) {
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
  logger.info('newSession:::::::::', session);
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
    expires: getCookieExpirationDate(new Date(decodedJwt.exp * 1000)),
    secure: isSecured,
    req,
  });
  newSetCookie.push(...cookieValue);

  const forwardedHeaders = req.headers as Headers;
  newSetCookie.forEach((cookie) => {
    // get cookie name and value only
    const [name, value] = cookie.split(';')[0].split('=');
    forwardedHeaders.set('cookie', `${name}=${value}`);
  });
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

export async function createSessionFromAccessTokenOnEdge(data: any): Promise<[string, any, string] | []> {
  const accessToken = data.accessToken ?? data.access_token;
  const refreshToken = data.refreshToken ?? data.refresh_token;
  const { payload: decodedJwt }: any = await JwtManager.verify(accessToken);
  decodedJwt.expiresIn = Math.floor((decodedJwt.exp * 1000 - Date.now()) / 1000);

  const tokens = { accessToken, refreshToken };
  const session = await encryptionEdge.sealTokens(tokens, getTtlInSeconds());
  return [session, decodedJwt, refreshToken];
}
