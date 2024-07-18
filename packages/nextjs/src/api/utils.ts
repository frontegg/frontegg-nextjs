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
 * These header is used to identify the tenant for login per tenant feature
 */
export const CUSTOM_LOGIN_HEADER = 'frontegg-login-alias';
/**
 * Build fetch request headers, remove invalid http headers
 * @param headers - Incoming request headers
 */
export function buildRequestHeaders(headers: Record<string, any>): Record<string, string> {
  let cookie = headers['cookie'];
  if (cookie != null && typeof cookie === 'string') {
    cookie = cookie.replace(/fe_session-[^=]*=[^;]*$/, '').replace(/fe_session-[^=]*=[^;]*;/, '');
  }
  if (cookie != null && typeof cookie === 'object') {
    cookie = Object.entries(cookie)
      .map(([key, value]) => `${key}=${value}`)
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
    [...fronteggAuthApiRoutesRegex, /^\/identity\/resources\/impersonation\/v[0-9]$/g].find((pathRegex) => {
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
