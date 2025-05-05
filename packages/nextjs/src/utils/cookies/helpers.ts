import cookieSerializer from './serializer';
import { COOKIE_MAX_LENGTH } from './constants';
import { chunkString } from '../common';
import config from '../../config';
import { CookieSerializeOptions, RequestType } from './types';
import { ServerResponse } from 'http';

/**
 * Return a cookieName with index, used for divided cookies.
 *
 * @param {number} index - The index of the cookie, starts with '1'
 * @param {string} _cookieName - Default is {@link config.cookieName}
 */
export const getIndexedCookieName = (index: number, _cookieName?: string) => {
  const cookieName = _cookieName ?? config.cookieName;
  return `${cookieName}-${index}`;
};

/**
 * Split cookie value if value length exceeded the MAX Length of a standard HTTP header.
 * Used to split the session cookie.
 *
 * @param {string} cookieName - Cookie name for serializing
 * @param {string} value - cookie value to split if needed
 * @param {CookieSerializeOptions} options - {@link CookieSerializeOptions} for serializing
 */
export const splitValueToChunks = (cookieName: string, value: string, options: CookieSerializeOptions): string[] => {
  const cookieOptionLength = cookieSerializer.serialize(getIndexedCookieName(1, cookieName), '', options).length;
  const chunkSize = COOKIE_MAX_LENGTH - cookieOptionLength - 1;

  const valueChunks = chunkString(value, chunkSize);

  return valueChunks.map((chunk, index) => {
    const indexedCookieName = getIndexedCookieName(index + 1, cookieName);
    return cookieSerializer.serialize(indexedCookieName, chunk, options) + ';';
  });
};

/**
 * Receive incoming http request, and extract the cookie header.
 * @return cookie as string if exists, else empty string
 *
 * @param {RequestType} request - Incoming HTTP Request
 */
export const getCookieHeader = (request: RequestType): string => {
  let cookieHeader: string | null | undefined;
  if ('credentials' in request) {
    cookieHeader = request.headers.get('cookie');
  } else {
    cookieHeader = request.headers.cookie;
  }
  if (!cookieHeader) {
    return '';
  }

  return cookieHeader;
};

/**
 * Receive http response, and extract the set-cookie header.
 * @return cookie as string if exists, else empty string
 *
 * @param {ResponseType} response - HTTP Response
 */
export const getSetCookieHeader = (response: ServerResponse): string => {
  let cookieHeader = response.getHeader('set-cookie');
  const cookies: string[] = [];
  if (!Array.isArray(cookieHeader)) {
    cookies.push(`${cookieHeader}`);
  } else {
    cookies.push(...cookieHeader);
  }
  return cookies.map((cookie) => cookie.split(';')[0]).join(';');
};

export const getRefreshTokenCookieNameVariants = () => {
  if (config.rewriteCookieByAppId && config.appId) {
    return [
      `fe_refresh_${config.appId}`,
      `fe_refresh_${config.appId.replace('-', '')}`,
      `fe_refresh_${config.appId.replace(/-/g, '')}`,
    ];
  } else {
    return [
      `fe_refresh_${config.clientId}`,
      `fe_refresh_${config.clientId.replace('-', '')}`,
      `fe_refresh_${config.clientId.replace(/-/g, '')}`,
    ];
  }
};

export function getCookieExpirationDate(defaultDate: Date): Date {
  const isHosted = true;

  if (isHosted) {
    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    return now;
  }

  return defaultDate;
}

export const MONTH_IN_SECONDS = 30 * 24 * 60 * 60; // 2592000

export function getTtlInSeconds(): number {
  return MONTH_IN_SECONDS;
}
