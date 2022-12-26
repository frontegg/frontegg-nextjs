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

function chunkString(str: string, numChunks: number) {
  const chunkSize = Math.ceil(str.length / numChunks);
  const chunks: string[] = [];
  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    const end = (i + 1) * chunkSize;
    chunks.push(str.substring(start, end < str.length ? end : str.length));
  }
  return chunks;
}

class CookieManager {
  constructor() {}

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
    const firstCookieName = cookieName ?? `${FronteggConfig.cookieName}-1`;
    const cookieValue = cookie.serialize(firstCookieName, session, options);
    if (cookieValue.length < COOKIE_MAX_LENGTH) {
      return [cookieValue];
    }
    const cookieOptionLength = cookie.serialize(firstCookieName, '', options).length;
    const maxSessionLength = COOKIE_MAX_LENGTH - cookieOptionLength;
    return this.createSplitCookie(cookieName ?? FronteggConfig.cookieName, session, options, maxSessionLength);
  }

  createSplitCookie(
    cookieName: string,
    session: string,
    options: CookieSerializeOptions,
    maxSessionLength: number
  ): string[] {
    const numberOfCookies = Math.ceil(session.length / maxSessionLength);
    const splitSession = chunkString(session, numberOfCookies);
    const allCookies: string[] = [];
    for (let i = 1; i <= numberOfCookies; i++) {
      allCookies.push(cookie.serialize(`${cookieName}-${i}`, splitSession[i - 1], options));
    }
    return allCookies;
  }

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
    while (cookie.parse(cookieStr)[`${FronteggConfig.cookieName}-${i}`]) {
      sealFromCookies += cookie.parse(cookieStr)[`${FronteggConfig.cookieName}-${i}`];
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
      while (allCookies[`${FronteggConfig.cookieName}-${cookieNumber}`]) {
        cookieToRemove.push(`${FronteggConfig.cookieName}-${cookieNumber}`);
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
