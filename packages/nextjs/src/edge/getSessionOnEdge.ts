import type { IncomingMessage } from 'http';
import { FronteggNextJSSession } from '../types';
import CookieManager from '../utils/cookies';
import createSession from '../utils/createSession';
import encryptionEdge from '../utils/encryption-edge';
import api from '../api';
import { NextResponse } from 'next/server';
import config from '../config';
import JwtManager from '../utils/jwt';
import encryptionUtils from '../utils/encryption-edge';
import Cookies from '../utils/cookies';

async function createSessionFromAccessTokenEdge(data: any): Promise<[string, any, string] | []> {
  const accessToken = data.accessToken ?? data.access_token;
  const refreshToken = data.refreshToken ?? data.refresh_token;
  const { payload: decodedJwt }: any = await JwtManager.verify(accessToken);
  decodedJwt.expiresIn = Math.floor((decodedJwt.exp * 1000 - Date.now()) / 1000);

  const tokens = { accessToken, refreshToken };
  const session = await encryptionUtils.sealTokens(tokens, decodedJwt.exp);
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
  const response = await api.exchangeHostedLoginToken(
    {
      'Content-Type': 'application/json',
    },
    code,
    config.clientId,
    config.clientSecret!
  );

  const headers = response.headers;
  const data = await response.json();
  console.log('session', headers, data);

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
  const refreshCookie = CookieManager.create({
    cookieName: `fe_refresh_${config.clientId.replace('-', '')}`,
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
