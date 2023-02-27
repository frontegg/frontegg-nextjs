export const FRONTEGG_AFTER_AUTH_REDIRECT_URL = 'FRONTEGG_AFTER_AUTH_REDIRECT_URL';

/**
 * Matches if val contains an invalid field-vchar
 *  field-value    = *( field-content / obs-fold )
 *  field-content  = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 *  field-vchar    = VCHAR / obs-text
 *
 *  headerCharRegex have been lifted from
 *  https://github.com/nodejs/node/blob/main/lib/_http_common.js
 */
export const headerCharRegex = /[^\t\x20-\x7e\x80-\xff]/;
export const cookieContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
