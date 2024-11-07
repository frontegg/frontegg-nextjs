import type { IncomingMessage } from 'http';
import { FronteggNextJSSession } from '../types';
import CookieManager from '../utils/cookies';
import createSession from '../utils/createSession';
import encryptionEdge from '../utils/encryption-edge';
import api from '../api';
import { NextResponse } from 'next/server';
import config from '../config';
import JwtManager from '../utils/jwt';
import { buildRequestHeaders, FRONTEGG_CLIENT_SECRET_HEADER, FRONTEGG_FORWARD_IP_HEADER } from '../api/utils';

async function createSessionFromAccessTokenEdge(data: any): Promise<[string, any, string] | []> {
  const accessToken = data.accessToken ?? data.access_token;
  const refreshToken = data.refreshToken ?? data.refresh_token;
  const { payload: decodedJwt }: any = await JwtManager.verify(accessToken);
  decodedJwt.expiresIn = Math.floor((decodedJwt.exp * 1000 - Date.now()) / 1000);

  const tokens = { accessToken, refreshToken };
  const session = await encryptionEdge.sealTokens(tokens, decodedJwt.exp);
  return [session, decodedJwt, refreshToken];
}

export const getSessionOnEdge = (req: IncomingMessage | Request): Promise<FronteggNextJSSession | undefined> => {
  const cookies = CookieManager.getSessionCookieFromRequest(req);
  return createSession(cookies, encryptionEdge);
};

export const handleHostedLoginCallback = async (
  req: IncomingMessage | Request,
  pathname: string,
  searchParams: URLSearchParams
): Promise<NextResponse> => {
  if (!isHostedLoginCallback(pathname, searchParams)) {
    return NextResponse.next();
  }

  const code = searchParams.get('code') ?? '';

  let headers: Record<string, string> = {};
  let clientIp: string | undefined = undefined;
  if (typeof req.headers?.get === 'function') {
    clientIp =
      req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || (req as any).socket?.remoteAddress;
  } else if (typeof req.headers === 'object') {
    let requestHeaders: any = { ...req.headers };
    clientIp =
      requestHeaders['cf-connecting-ip'] || requestHeaders['x-forwarded-for'] || (req as any).socket?.remoteAddress;
  }

  if (clientIp && config.shouldForwardIp) {
    headers[FRONTEGG_FORWARD_IP_HEADER] = clientIp;
    headers[FRONTEGG_CLIENT_SECRET_HEADER] = config.clientSecret ?? '';
  }

  const response = await api.exchangeHostedLoginToken(
    buildRequestHeaders(headers),
    code,
    config.clientId,
    config.clientSecret!
  );

  const data = await response.json();

  const [session, decodedJwt, refreshToken] = await createSessionFromAccessTokenEdge(data);

  if (!session) {
    return NextResponse.redirect(config.appUrl);
  }
  const isSecured = config.isSSL;
  const cookieValue = CookieManager.create({
    value: session,
    expires: new Date(decodedJwt.exp * 1000),
    secure: isSecured,
  });

  let cookieName = `fe_refresh_${config.clientId.replace('-', '')}`;
  if (config.rewriteCookieByAppId && config.appId) {
    cookieName = `fe_refresh_${config.appId.replace('-', '')}`;
  }
  const refreshCookie = CookieManager.create({
    cookieName,
    value: refreshToken ?? '',
    expires: new Date(decodedJwt.exp * 1000),
    secure: isSecured,
  });
  const sessionCookieHeaders: [string, string][] = cookieValue.map((cookie) => ['set-cookie', cookie]);
  const refreshCookieHeaders: [string, string][] = refreshCookie.map((cookie) => ['set-cookie', cookie]);

  return NextResponse.redirect(config.appUrl, {
    headers: [...sessionCookieHeaders, ...refreshCookieHeaders],
  });
};

export const isHostedLoginCallback = (pathname: string, searchParams: URLSearchParams): boolean => {
  if (config.secureJwtEnabled) {
    if (pathname.startsWith('/oauth/callback')) {
      return searchParams.get('code') != null;
    }
  }
  return false;
};
