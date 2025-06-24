import config from '../config';
import sdkVersion from '../sdkVersion';
import nextjsPkg from 'next/package.json';
import { fronteggAuthApiRoutesRegex } from '@frontegg/rest-api';
import { headerCharRegex } from '../utils/common/constants';

interface GetRequestOptions {
  url: string;
  credentials?: RequestCredentials;
  headers?: HeadersInit;
}

export const Get = ({ url, credentials = 'include', headers }: GetRequestOptions) =>
  fetch(url, { method: 'GET', credentials, headers });

interface PostRequestOptions extends GetRequestOptions {
  body: string;
}

export const Post = ({ url, credentials = 'include', headers, body }: PostRequestOptions) =>
  fetch(url, { method: 'POST', credentials, headers, body });

/**
 * NodeJS 18 start using undici as http request handler,
 * undici http request does not accept invalid headers
 * for more details see:
 * https://github.com/nodejs/undici/blob/2b260c997ad4efe4ed2064b264b4b546a59e7a67/lib/core/request.js#L282
 * @param headers
 */
export function removeInvalidHeaders(headers: Record<string, string>) {
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

/**
 * These headers are used to identify the tenant for login per tenant feature
 */
export const CUSTOM_LOGIN_HEADER = 'frontegg-login-alias';
export const FRONTEGG_FORWARD_IP_HEADER = 'x-frontegg-forwarded-for';
export const FRONTEGG_HEADERS_VERIFIER_HEADER = 'x-frontegg-headers-verifier';
export const FRONTEGG_APPLICATION_ID_HEADER = 'frontegg-requested-application-id';
export const FRONTEGG_VENDOR_ID_HEADER = 'frontegg-vendor-id';

/**
 * Build fetch request headers, remove invalid http headers
 * @param headers - Incoming request headers
 */
export function buildRequestHeaders(headers: Record<string, any>): Record<string, string> {
  let cookie = headers['cookie'];
  if (cookie != null && typeof cookie === 'string') {
    cookie = cookie.replace(/fe_session-[^=]*=[^;]*$/, '').replace(/fe_session-[^=]*=[^;]*;/, '');

    if (config.rewriteCookieByAppId && config.appId) {
      cookie = cookie
        .split(';')
        .filter((cookieStr: string) => !cookieStr.trim().startsWith(`fe_refresh_${config.clientId.replace('-', '')}`))
        .join(';');
      cookie = cookie.replace(
        `fe_refresh_${config.appId.replace('-', '')}`,
        `fe_refresh_${config.clientId.replace('-', '')}`
      );
    }
  }
  if (cookie != null && typeof cookie === 'object') {
    cookie = Object.entries(cookie)
      .filter(([key]) => {
        if (config.rewriteCookieByAppId && config.appId) {
          return key !== `fe_refresh_${config.clientId.replace('-', '')}`;
        }
        return true;
      })
      .map(([key, value]) => {
        if (config.rewriteCookieByAppId && config.appId && key === `fe_refresh_${config.appId.replace('-', '')}`) {
          return `fe_refresh_${config.clientId.replace('-', '')}=${value}`;
        } else {
          return `${key}=${value}`;
        }
      })
      .join('; ');
  }

  const preparedHeaders: Record<string, string> = {
    authorization: headers['authorization'],
    'accept-encoding': headers['accept-encoding'],
    'accept-language': headers['accept-language'],
    accept: headers['accept'],
    'content-type': 'application/json',
    origin: config.baseUrl,
    cookie,
    'user-agent': headers['user-agent'],
    'cache-control': headers['cache-control'],
    'x-frontegg-framework': `next@${nextjsPkg.version}`,
    'x-frontegg-sdk': `@frontegg/nextjs@${sdkVersion.version}`,
  };

  if (headers[FRONTEGG_APPLICATION_ID_HEADER]) {
    preparedHeaders[FRONTEGG_APPLICATION_ID_HEADER] = headers[FRONTEGG_APPLICATION_ID_HEADER];
  }

  const clientIp = getClientIp(
    headers[FRONTEGG_FORWARD_IP_HEADER] || headers['cf-connecting-ip'] || headers['x-forwarded-for']
  );

  if (clientIp && config.shouldForwardIp) {
    console.log('inside buildRequestHeaders', process.env.VERCEL);
    console.log('headers[FRONTEGG_FORWARD_IP_HEADER]', headers[FRONTEGG_FORWARD_IP_HEADER]);
    console.log('headers[cf-connecting-ip]', headers['cf-connecting-ip']);
    console.log('headers[x-forwarded-for]', headers['x-forwarded-for']);
    preparedHeaders[FRONTEGG_FORWARD_IP_HEADER] = clientIp;
    preparedHeaders[FRONTEGG_HEADERS_VERIFIER_HEADER] = config.sharedSecret ?? '';
    preparedHeaders[FRONTEGG_VENDOR_ID_HEADER] = config.clientId;
  }

  if (headers[CUSTOM_LOGIN_HEADER]) {
    preparedHeaders[CUSTOM_LOGIN_HEADER] = headers[CUSTOM_LOGIN_HEADER];
  }
  return removeInvalidHeaders({ ...preparedHeaders });
}

/**
 * Return parsed json response if http status code = 200
 * @param res
 */
export const parseHttpResponse = async <T>(res: Response): Promise<T | undefined> => {
  if (!res.ok) {
    return undefined;
  }
  return await res.json();
};

/**
 * Checks if the given path should be forwarded to the Next.js server middleware.
 *
 *
 * @param {string} path - The path to check for authentication API routes.
 * @returns {boolean} Returns true if the path is a frontegg authentication API route or ends with '/postlogin' or '/prelogin'; otherwise, returns false.
 */
export function isMiddlewarePath(path: string): boolean {
  let isAuthPath =
    fronteggAuthApiRoutesRegex.find((pathRegex) => {
      if (typeof pathRegex === 'string') {
        return pathRegex === path;
      } else {
        return new RegExp(pathRegex).test(path);
      }
    }) != null;

  // if(!isAuthPath){
  //   isAuthPath = /^\/identity\/resources\/auth\/v[0-9]*\/user\/sso\/[^\/]*\/postlogin$/g.test(path)
  // }
  // if(!isAuthPath){
  //   isAuthPath = /^\/identity\/resources\/auth\/v[0-9]*\/passwordless\/[^\/]*\/prelogin$/g.test(path)
  // }
  // if(!isAuthPath){
  //   isAuthPath = /^\/identity\/resources\/auth\/v[0-9]*\/[^\/]*\/prelogin$/g.test(path)
  // }

  if (!isAuthPath) {
    const isSocialLoginPath = /^\/identity\/resources\/auth\/v[0-9]*\/user\/sso\/default\/[^\/]*\/prelogin$/.test(path);
    isAuthPath = (path.endsWith('/postlogin') || path.endsWith('/prelogin')) && !isSocialLoginPath;
  }

  return isAuthPath;
}

/**
 * Extracts the real client IP address from a raw IP string or array.
 *
 * If the input contains multiple IPs (e.g., from the `x-forwarded-for` header),
 * it returns only the first IP, which typically represents the real client.
 *
 * @param rawIp - A single IP string or an array of IPs.
 * @returns The first IP address as a string, or undefined if not available.
 */
export function getClientIp(rawIp?: string | string[] | null): string | undefined {
  if (!rawIp) return undefined;
  const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp;
  return ip.split(',')[0].trim();
}
