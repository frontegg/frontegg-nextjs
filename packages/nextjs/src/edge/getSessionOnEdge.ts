import type { IncomingMessage } from 'http';
import { FronteggEdgeSession, FronteggNextJSSession } from '../types';
import CookieManager from '../utils/cookies';
import createSession from '../utils/createSession';
import encryptionEdge from '../utils/encryption-edge';
import api from '../api';
import { type NextRequest, NextResponse } from 'next/server';
import config from '../config';
import JwtManager from '../utils/jwt';
import { buildRequestHeaders, FRONTEGG_HEADERS_VERIFIER_HEADER, FRONTEGG_FORWARD_IP_HEADER } from '../api/utils';
import fronteggLogger from '../utils/fronteggLogger';
import { refreshAccessTokenIfNeededOnEdge } from './refreshAccessTokenIfNeededOnEdge';
import { redirectToLogin } from './redirectToLogin';
import { shouldByPassMiddleware } from './shouldBypassMiddleware';

const logger = fronteggLogger.child({ tag: 'EdgeRuntime.getSessionOnEdge' });

export type HandleSessionOnEdge = {
  request: IncomingMessage | Request;
  pathname: string;
  headers: NextRequest['headers'];
  searchParams: URLSearchParams;
};

export const handleSessionOnEdge = async (params: HandleSessionOnEdge): Promise<NextResponse> => {
  const { request, pathname, searchParams, headers } = params;

  if (isHostedLoginCallback(pathname, searchParams)) {
    return handleHostedLoginCallback(request, pathname, searchParams);
  }

  if (shouldByPassMiddleware(pathname, headers /*, options: optional bypass configuration */)) {
    return NextResponse.next();
  }

  const edgeSession = await checkSessionOnEdge(request);
  if (!edgeSession) {
    return redirectToLogin(pathname, searchParams);
  }
  if (edgeSession.headers) {
    return NextResponse.next({
      headers: edgeSession.headers,
      request: {
        headers: edgeSession.forwardedHeaders,
      },
    });
  }
  return NextResponse.next();
};

const GET_SESSION_ON_EDGE_DEPRECATED_WARN = `Deprecation Notice: getSessionOnEdge has been deprecated. Please use handleSessionOnEdge instead. For example:

file: middleware.ts
\`\`\`ts
  import { NextRequest } from 'next/server';
  import { handleSessionOnEdge } from '@frontegg/nextjs/edge';
    
  export const middleware = async (request: NextRequest) => {
    const { pathname, searchParams } = request.nextUrl;
    const headers = request.headers;
    
    // Additional logic if needed
    
    return handleSessionOnEdge({ request, pathname, searchParams, headers });
  };
  
  
  export const config = {
    matcher: '/(.*)',
  };

\`\`\`

Alternatively, to manually verify the session, you can use checkSessionOnEdge. Note that this method does not redirect to the login page if the session is invalid.
`;

/**
 * getSessionOnEdge is deprecated, please use handleSessionOnEdge instead example:
 *
 * ```ts
 *   import { NextRequest } from 'next/server';
 *   import { handleSessionOnEdge } from '@frontegg/nextjs/edge';
 *
 *   export const middleware = async (request: NextRequest) => {
 *     const { pathname, searchParams } = request.nextUrl;
 *     const headers = request.headers;
 *
 *     // Additional logic if needed
 *
 *     return handleSessionOnEdge({ request, pathname, searchParams, headers });
 *   };
 *
 *   export const config = {
 *     matcher: '/(.*)',
 *   };
 * ```
 * @deprecated
 */

export const getSessionOnEdge = (
  req: IncomingMessage | Request,
  disableWarning = false
): Promise<FronteggNextJSSession | undefined> => {
  const logger = fronteggLogger.child({ tag: 'EdgeRuntime.getSessionOnEdge' });
  const cookies = CookieManager.getSessionCookieFromRequest(req);
  if (!disableWarning) {
    logger.info(GET_SESSION_ON_EDGE_DEPRECATED_WARN);
  }
  return createSession(cookies, encryptionEdge);
};

/**
 * Check session on edge and return session if exists this method does not redirect to login page
 * Example:
 *
 * ```ts
 *   import { NextRequest } from 'next/server';
 *   import { handleSessionOnEdge } from '@frontegg/nextjs/edge';
 *
 *   export const middleware = async (request: NextRequest) => {
 *     const { pathname, searchParams } = request.nextUrl;
 *     const headers = request.headers;
 *
 *     // Additional logic if needed
 *
 *     // check if it's a hosted login callback
 *     if (isHostedLoginCallback(pathname, searchParams)) {
 *       return handleHostedLoginCallback(request, pathname, searchParams);
 *     }
 *
 *     // check if we should bypass the middleware
 *     if (shouldByPassMiddleware(pathname)) {
 *       return NextResponse.next();
 *     }
 *
 *     // check session
 *     const session = await checkSessionOnEdge(request);
 *
 *     if (!session) {
 *       return redirectToLogin(pathname);
 *     }
 *
 *     // if headers are present forward them to the next response / request
 *     if (session.headers) {
 *        return NextResponse.next({
 *          headers: edgeSession.headers,
 *          request:{
 *            headers: edgeSession.forwardedHeaders
 *          }
 *        });
 *     }
 *     return NextResponse.next();
 *   };
 * ```
 *
 *
 * @param req
 */
export const checkSessionOnEdge = async (req: IncomingMessage | Request): Promise<FronteggEdgeSession | undefined> => {
  const sessionCookies = CookieManager.getSessionCookieFromRequest(req);
  let existingSession = await createSession(sessionCookies, encryptionEdge);
  if (existingSession) {
    logger.debug('session resolved from session cookie');
    return {
      session: existingSession,
    };
  }

  logger.debug('Failed to resolve session from cookie, going to refresh token');
  return refreshAccessTokenIfNeededOnEdge(req);
};

async function createSessionFromAccessTokenEdge(data: any): Promise<[string, any, string] | []> {
  const accessToken = data.accessToken ?? data.access_token;
  const refreshToken = data.refreshToken ?? data.refresh_token;
  const { payload: decodedJwt }: any = await JwtManager.verify(accessToken);
  decodedJwt.expiresIn = Math.floor((decodedJwt.exp * 1000 - Date.now()) / 1000);

  const tokens = { accessToken, refreshToken };
  const session = await encryptionEdge.sealTokens(tokens, decodedJwt.exp);
  return [session, decodedJwt, refreshToken];
}

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
    headers[FRONTEGG_HEADERS_VERIFIER_HEADER] = config.sharedSecret ?? '';
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
