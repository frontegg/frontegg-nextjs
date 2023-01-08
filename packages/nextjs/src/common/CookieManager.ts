import cookie, { CookieSerializeOptions } from 'cookie';
import { ServerResponse } from 'http';
import { RequestCookie } from 'next/dist/server/web/spec-extension/cookies';
import FronteggConfig from './FronteggConfig';
import { RequestType } from './types';
import { chunkString } from './utils';
import { COOKIE_MAX_LENGTH } from './consts';

type CreateCookieArguments = {
  cookieName?: string;
  value: string;
  expires: CookieSerializeOptions['expires'];
  isSecured: CookieSerializeOptions['secure'];
  cookieDomain?: CookieSerializeOptions['domain'];
  httpOnly?: CookieSerializeOptions['httpOnly'];
  path?: CookieSerializeOptions['path'];
};

type RemoveCookiesArguments = {
  cookieNames?: string[];
  isSecured: boolean;
  cookieDomain: string;
  res: ServerResponse;
  req?: RequestType;
};

class CookieManager {
  constructor() {}

  getCookieName = (cookieNumber?: number, cookieName = FronteggConfig.cookieName) =>
    cookieNumber ? `${cookieName}-${cookieNumber}` : cookieName;

  rewriteCookieProperty(header: string | string[], config: any, property: string): string | string[] {
    if (Array.isArray(header)) {
      return header.map((headerElement) => {
        return this.rewriteCookieProperty(headerElement, config, property);
      }) as string[];
    }
    return header.replace(new RegExp('(;\\s*' + property + '=)([^;]+)', 'i'), (match, prefix, previousValue) => {
      let newValue;
      if (previousValue in config) {
        newValue = config[previousValue];
      } else if ('*' in config) {
        newValue = config['*'];
      } else {
        // no match, return previous value
        return match;
      }
      if (newValue) {
        // replace value
        return prefix + newValue;
      } else {
        // remove value
        return '';
      }
    });
  }

  createCookie({
    cookieName,
    value,
    expires,
    isSecured,
    cookieDomain = FronteggConfig.cookieDomain,
    httpOnly = true,
    path = '/',
  }: CreateCookieArguments) {
    const options = {
      expires,
      httpOnly,
      domain: cookieDomain,
      path,
      sameSite: isSecured ? ('none' as const) : undefined,
      secure: isSecured,
    };
    const cookieValue = cookie.serialize(cookieName ?? this.getCookieName(1), value, options);
    if (cookieValue.length <= COOKIE_MAX_LENGTH) {
      return [cookieValue];
    }
    const valueChunks = this.splitValueToChunks(cookieName, value, options);
    return this.mapValueChunksToCookies(cookieName, valueChunks, options);
  }

  splitValueToChunks(cookieName: string | undefined, value: string, options: CookieSerializeOptions): string[] {
    const cookieOptionLength = cookie.serialize(this.getCookieName(1, cookieName), '', options).length;
    const maxValueLength = COOKIE_MAX_LENGTH - cookieOptionLength;
    return chunkString(value, maxValueLength);
  }

  mapValueChunksToCookies = (
    cookieName: string | undefined,
    valueChunks: string[],
    options: CookieSerializeOptions
  ): string[] =>
    valueChunks.map((chunk, index) => cookie.serialize(this.getCookieName(index + 1, cookieName), chunk, options));

  getCookieStringFromRequest = (req: RequestType) =>
    'credentials' in req ? req.headers.get('cookie') || '' : req.headers.cookie || '';

  getParsedCookieFromRequest(req?: RequestType): string | undefined {
    if (!req) {
      return undefined;
    }
    const cookieStr = this.getCookieStringFromRequest(req);
    return this.parseCookie(cookieStr);
  }

  parseCookie(cookieStr: string) {
    const cookies = cookie.parse(cookieStr);
    let sealFromCookies = '';
    let i = 1;
    while (cookies[this.getCookieName(i)]) {
      sealFromCookies += cookies[this.getCookieName(i)];
      i++;
    }
    return sealFromCookies !== '' ? sealFromCookies : undefined;
  }

  parseCookieFromArray(cookies: RequestCookie[]): string | undefined {
    const cookieChunks = cookies.filter((c) => c.name.includes(this.getCookieName()));
    if (!cookieChunks) {
      return undefined;
    }
    cookieChunks.sort((a, b) => {
      const firstCookieNumber = parseInt(a.name.slice(-1));
      const secondCookieNumber = parseInt(b.name.slice(-1));
      return firstCookieNumber > secondCookieNumber ? 1 : -1;
    });
    return cookieChunks.map((c) => c.value).join('');
  }

  addToCookies(newCookies: string[], res: ServerResponse): void {
    let existingSetCookie = (res.getHeader('set-cookie') as string[] | string) ?? [];
    if (typeof existingSetCookie === 'string') {
      existingSetCookie = [existingSetCookie];
    }
    res.setHeader('set-cookie', [...existingSetCookie, ...newCookies]);
  }
  createEmptySingleCookie = (cookieName: string, isSecured: boolean, cookieDomain: string) =>
    this.createCookie({ cookieName, value: '', expires: new Date(), isSecured, cookieDomain });

  createEmptyCookies = (isSecured: boolean, cookieDomain: string, cookiesToRemove: string[]): string[] => {
    const allEmptyCookies: string[] = [];
    cookiesToRemove.forEach((name) => {
      allEmptyCookies.push(...this.createEmptySingleCookie(name, isSecured, cookieDomain));
    });
    return allEmptyCookies;
  };

  getCookiesToRemove = (req?: RequestType): string[] => {
    if (!req) {
      return [];
    }
    try {
      const cookieStr = this.getCookieStringFromRequest(req);
      const cookies = cookieStr && cookie.parse(cookieStr);
      if (!cookies) {
        return [];
      }
      let cookieNumber = 1;
      const cookieToRemove = [];
      while (cookies[this.getCookieName(cookieNumber)]) {
        cookieToRemove.push(this.getCookieName(cookieNumber));
        cookieNumber++;
      }
      return cookieToRemove;
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  removeCookies({ cookieNames, isSecured, cookieDomain, res, req }: RemoveCookiesArguments): void {
    const cookiesToRemove = this.getCookiesToRemove(req);
    const cookieValue = this.createEmptyCookies(isSecured, cookieDomain, cookieNames ?? cookiesToRemove);
    let existingSetCookie = (res.getHeader('set-cookie') as string[] | string) ?? [];
    if (typeof existingSetCookie === 'string') {
      existingSetCookie = [existingSetCookie];
    }
    res.setHeader('set-cookie', [...existingSetCookie, ...cookieValue]);
  }

  modifySetCookieIfUnsecure = (setCookieValue: string[] | undefined, isSecured: boolean): string[] | undefined => {
    if (!setCookieValue) {
      return setCookieValue;
    }
    if (setCookieValue.length > 0) {
      return setCookieValue.map((c) => {
        const cookie = c.split('; ');
        if (isSecured) {
          return c;
        }
        return cookie.filter((property) => property !== 'Secure' && property !== 'SameSite=None').join('; ');
      });
    }
    return setCookieValue;
  };
}

export default new CookieManager();
