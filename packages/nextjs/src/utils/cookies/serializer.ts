import { cookieContentRegExp } from '../common/constants';
import { CookieSerializeOptions } from './types';

/**
 * Determine if value is a Date.
 *
 * @param {*} val
 * @private
 */

function isDate(val: any) {
  return Object.prototype.toString.call(val) === '[object Date]' || val instanceof Date;
}

/**
 * Parse an HTTP Cookie header string and returning an object of all cookie
 * name-value pairs.
 *
 * @param str the string representing a `Cookie` header value
 */
function parse(str: any): Record<string, string> {
  if (typeof str !== 'string') {
    throw new TypeError('argument str must be a string');
  }

  const obj: Record<string, string> = {};

  let index = 0;
  while (index < str.length) {
    const eqIdx = str.indexOf('=', index);

    // no more cookie pairs
    if (eqIdx === -1) {
      break;
    }

    let endIdx = str.indexOf(';', index);

    if (endIdx === -1) {
      endIdx = str.length;
    } else if (endIdx < eqIdx) {
      // backtrack on prior semicolon
      index = str.lastIndexOf(';', eqIdx - 1) + 1;
      continue;
    }

    const key = str.slice(index, eqIdx).trim();

    // only assign once
    if (undefined === obj[key]) {
      let val = str.slice(eqIdx + 1, endIdx).trim();

      // quoted values
      if (val.charCodeAt(0) === 0x22) {
        val = val.slice(1, -1);
      }

      try {
        obj[key] = val.indexOf('%') !== -1 ? decodeURIComponent(val) : val;
      } catch (e) {
        obj[key] = val;
      }
    }

    index = endIdx + 1;
  }

  return obj;
}

/**
 * Serialize a cookie name-value pair into a `Set-Cookie` header string.
 *
 * @param name the name for the cookie
 * @param val value to set the cookie to
 * @param [options] object containing serialization options
 * @throws {TypeError} when `maxAge` options is invalid
 */
function serialize(name: string, val: string, options?: CookieSerializeOptions): string {
  const opt = options || {};

  if (!cookieContentRegExp.test(name)) {
    throw new TypeError('argument name is invalid');
  }

  const value = encodeURIComponent(val);

  if (value && !cookieContentRegExp.test(value)) {
    throw new TypeError('argument val is invalid');
  }

  let str = name + '=' + value;

  if (null != opt.maxAge) {
    // noinspection PointlessArithmeticExpressionJS
    const maxAge = opt.maxAge - 0;

    if (isNaN(maxAge) || !isFinite(maxAge)) {
      throw new TypeError('option maxAge is invalid');
    }

    str += '; Max-Age=' + Math.floor(maxAge);
  }

  if (opt.domain) {
    if (!cookieContentRegExp.test(opt.domain)) {
      throw new TypeError('option domain is invalid');
    }

    str += '; Domain=' + opt.domain;
  }

  if (opt.path) {
    if (!cookieContentRegExp.test(opt.path)) {
      throw new TypeError('option path is invalid');
    }

    str += '; Path=' + opt.path;
  }

  if (opt.expires) {
    const expires = opt.expires;

    if (!isDate(expires) || isNaN(expires.valueOf())) {
      throw new TypeError('option expires is invalid');
    }

    str += '; Expires=' + expires.toUTCString();
  }

  if (opt.httpOnly) {
    str += '; HttpOnly';
  }

  if (opt.secure) {
    str += '; Secure';
  }

  if (opt.priority) {
    // noinspection SuspiciousTypeOfGuard
    const priority = typeof opt.priority === 'string' ? opt.priority.toLowerCase() : opt.priority;

    switch (priority) {
      case 'low':
        str += '; Priority=Low';
        break;
      case 'medium':
        str += '; Priority=Medium';
        break;
      case 'high':
        str += '; Priority=High';
        break;
      default:
        throw new TypeError('option priority is invalid');
    }
  }

  if (opt.sameSite) {
    const sameSite = typeof opt.sameSite === 'string' ? opt.sameSite.toLowerCase() : opt.sameSite;

    switch (sameSite) {
      case true:
        str += '; SameSite=Strict';
        break;
      case 'lax':
        str += '; SameSite=Lax';
        break;
      case 'strict':
        str += '; SameSite=Strict';
        break;
      case 'none':
        str += '; SameSite=None';
        break;
      default:
        throw new TypeError('option sameSite is invalid');
    }
  }

  return str;
}

export default {
  serialize,
  parse,
};
