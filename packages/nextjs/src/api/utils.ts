import config from '../config';
import sdkVersion from '../sdkVersion';
import nextjsPkg from 'next/package.json';

/**
 * Matches if val contains an invalid field-vchar
 *  field-value    = *( field-content / obs-fold )
 *  field-content  = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 *  field-vchar    = VCHAR / obs-text
 *
 *  headerCharRegex have been lifted from
 *  https://github.com/nodejs/node/blob/main/lib/_http_common.js
 */
const headerCharRegex = /[^\t\x20-\x7e\x80-\xff]/;

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

export function buildRequestHeaders(
  headers: Record<string, string>,
  additionalHeaders: Record<string, string> = {}
): Record<string, string> {
  const preparedHeaders: Record<string, string> = {
    'accept-encoding': headers['accept-encoding'],
    'accept-language': headers['accept-language'],
    accept: headers['accept'],
    'content-type': 'application/json',
    origin: config.baseUrl,
    'user-agent': headers['user-agent'],
    'cache-control': headers['cache-control'],
    'x-frontegg-framework': `next@${nextjsPkg.version}`,
    'x-frontegg-sdk': `@frontegg/nextjs@${sdkVersion.version}`,
  };

  return removeInvalidHeaders({
    ...preparedHeaders,
    ...additionalHeaders,
  });
}