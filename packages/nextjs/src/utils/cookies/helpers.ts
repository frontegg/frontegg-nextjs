import cookieSerializer from './serializer';
import { COOKIE_MAX_LENGTH } from './constants';
import { chunkString } from '../common';
import config from '../../config';
import { CookieSerializeOptions, RequestType } from './types';

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

export const getRefreshTokenCookieNameVariants = () => [
  `fe_refresh_${config.clientId}`,
  `fe_refresh_${config.clientId.replace('-', '')}`,
  `fe_refresh_${config.clientId.replace(/-/g, '')}`,
];
