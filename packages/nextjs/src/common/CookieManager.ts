import cookie, { CookieSerializeOptions } from 'cookie';
import { ServerResponse } from 'http';
import { RequestCookie } from 'next/dist/server/web/spec-extension/cookies';
import FronteggConfig from './FronteggConfig';
import { RequestType } from './types';

type CreateCookieArguments = {
  cookieName?: string;
  session: string;
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

const COOKIE_MAX_LENGTH = 4096;

function chunkString(str: string, chunkSize: number) {
  const numChunks = Math.ceil(str.length / chunkSize);
  const chunks: string[] = [];
  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    const end = start + chunkSize;
    chunks.push(str.substring(start, end < str.length ? end : str.length));
  }
  return chunks;
}

class CookieManager {
  constructor() {}

  getCookieName = (cookieNumber: number, cookieName?: string) =>
    `${cookieName ?? FronteggConfig.cookieName}-${cookieNumber}`;

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
    session,
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
    const cookieValue = cookie.serialize(cookieName ?? this.getCookieName(1), session, options);
    if (cookieValue.length < COOKIE_MAX_LENGTH) {
      return [cookieValue];
    }
    const sessionChunks = this.splitSessionToChunks(cookieName, session, options);
    return this.mapSessionChunksToCookies(cookieName, sessionChunks, options);
  }

  splitSessionToChunks(cookieName: string | undefined, session: string, options: CookieSerializeOptions): string[] {
    const cookieOptionLength = cookie.serialize(this.getCookieName(1, cookieName), '', options).length;
    const maxSessionLength = COOKIE_MAX_LENGTH - cookieOptionLength;
    return chunkString(session, maxSessionLength);
  }

  mapSessionChunksToCookies = (
    cookieName: string | undefined,
    sessionChunks: string[],
    options: CookieSerializeOptions
  ): string[] =>
    sessionChunks.map((sessionChunk, index) =>
      cookie.serialize(this.getCookieName(index + 1, cookieName), sessionChunk, options)
    );

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
    let sealFromCookies = '';
    let i = 1;
    while (cookie.parse(cookieStr)[this.getCookieName(i)]) {
      sealFromCookies += cookie.parse(cookieStr)[this.getCookieName(i)];
      i++;
    }
    return sealFromCookies !== '' ? sealFromCookies : undefined;
  }

  parseCookieFromArray(cookies: RequestCookie[]): string | undefined {
    const userCookie = cookies.find((c) => c.name === FronteggConfig.cookieName);
    if (userCookie) {
      return userCookie.value;
    }
    const cookieChunks = cookies.filter((c) => c.name.includes(FronteggConfig.cookieName));
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
    this.createCookie({ cookieName, session: '', expires: new Date(), isSecured, cookieDomain });

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
      const allCookies = cookieStr && cookie.parse(cookieStr);
      if (!allCookies) {
        return [];
      }
      let cookieNumber = 1;
      const cookieToRemove = [];
      while (allCookies[this.getCookieName(cookieNumber)]) {
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
