import cookieSerializer from './serializer';
import type { RequestCookie } from 'next/dist/server/web/spec-extension/cookies';
import config from '../../config';
import { CookieSerializeOptions, CreateCookieOptions, RemoveCookiesOptions, RequestType } from './types';
import { COOKIE_MAX_LENGTH } from './constants';

import {
  getCookieHeader,
  getIndexedCookieName,
  getRefreshTokenCookieNameVariants,
  splitValueToChunks,
} from './helpers';
import fronteggLogger from '../fronteggLogger';

class CookieManager {
  getCookieName = (cookieNumber?: number, cookieName = config.cookieName) =>
    cookieNumber ? getIndexedCookieName(cookieNumber, cookieName) : cookieName;

  get refreshTokenKey(): string {
    if (config.rewriteCookieByAppId && config.appId) {
      return `fe_refresh_${config.appId.replace(/-/g, '')}`;
    } else {
      return `fe_refresh_${config.clientId.replace(/-/g, '')}`;
    }
  }

  /**
   * This function creates list of empty cookies that already exists in the request.
   * This is used for removing existing cookies before creating new ones.
   * @param {CreateCookieOptions} options - Create cookie options
   */
  getEmptyCookiesBeforeCreatingNew(
    { req, value, secure, domain }: CreateCookieOptions,
    newCookies: string[]
  ): string[] {
    if (!req || !value) {
      return [];
    }
    const newCookieNames = newCookies.map((c) => c.split('=')[0]);
    const cookiesToRemove = this.getCookiesToRemove(req).filter((cookie) => newCookieNames.indexOf(cookie) === -1);
    if (cookiesToRemove.length === 0) {
      return [];
    }

    return this.createEmptyCookies(secure, domain ?? config.cookieDomain, cookiesToRemove, false);
  }

  /**
   * Validate and create new cookie headers.
   * The default value of `cookieName` is {@link config.cookieName}
   * @param {CreateCookieOptions} options - Create cookie options
   */
  create(options: CreateCookieOptions): string[] {
    const logger = fronteggLogger.child({ tag: 'CookieManager.create', level: options.silent ? 'error' : undefined });
    const cookieName = options.cookieName ?? this.getCookieName();
    const cookieValue = options.value;
    logger.info(`Creating new cookie for '${cookieName}'`);

    const serializeOptions: CookieSerializeOptions = {
      expires: options.expires,
      httpOnly: options.httpOnly ?? true,
      domain: options.domain ?? config.cookieDomain,
      path: options.path ?? '/',
      priority: 'high',
    };

    if (options.secure) {
      logger.debug(`Set cookie '${cookieName}' as secure`);
      serializeOptions.secure = options.secure;
      serializeOptions.sameSite = config.cookieSameSite;
    }

    const serializedCookie = cookieSerializer.serialize(cookieName, cookieValue, serializeOptions);

    let newCookies: string[] = [];
    if (serializedCookie.length <= COOKIE_MAX_LENGTH) {
      logger.info(`Successfully create a cookie header, '${cookieName}'`);
      newCookies = [serializedCookie];
    } else {
      logger.debug('Going to split cookie into chunks');
      /** Create chunked cookie headers and store value as array of headers */
      const cookies = splitValueToChunks(cookieName, cookieValue, serializeOptions);
      logger.info(`Successfully create chunked cookie headers, '${cookieName}' (count: ${cookies.length})`);
      newCookies = cookies;
    }

    const removedCookiesValue = this.getEmptyCookiesBeforeCreatingNew(options, newCookies);
    return [...removedCookiesValue, ...newCookies];
  }

  /**
   * Receive incoming http request, and extract the cookie header.
   * @return cookie as string if exists, else empty string
   *
   * @param {RequestType} request - Incoming HTTP Request
   */
  parseCookieHeader(request: RequestType): Record<string, string> {
    const logger = fronteggLogger.child({ tag: 'CookieManager.parseCookieHeader' });

    logger.info('Going to extract all cookies header from request');
    const cookieHeader = getCookieHeader(request);
    logger.info('Parsing cookie header to map');
    return cookieSerializer.parse(cookieHeader);
  }

  /**
   * Loop over cookie headers, extract, parse cookies and merged divided cookies from incoming http request,
   * @return full session cookie headers if exists, else return undefined
   * @param {RequestType} request - Incoming HTTP Request
   */
  getSessionCookieFromRequest(request?: RequestType): string | undefined {
    const logger = fronteggLogger.child({ tag: 'CookieManager.getSessionCookieFromRequest' });
    logger.info('Going to extract session cookies header from request');

    if (!request) {
      logger.info(`'request' argument is null, Cookie header not found`);
      return undefined;
    }

    logger.debug('Getting cookie header');
    const cookieStr = getCookieHeader(request);

    logger.debug('Parsing cookie header string');
    const cookies = cookieSerializer.parse(cookieStr);

    logger.debug('Loop over session cookie headers');
    let i = 1;
    let sessionCookies = '';
    let sessionCookieChunk: string | undefined = cookies[this.getCookieName()];
    if (sessionCookieChunk === undefined) {
      do {
        sessionCookieChunk = cookies[getIndexedCookieName(i++)];
        if (sessionCookieChunk) {
          sessionCookies += sessionCookieChunk;
        }
      } while (sessionCookieChunk);
    } else {
      sessionCookies = sessionCookieChunk;
    }

    if (sessionCookies.length === 0) {
      logger.info('Session cookie NOT found');
      return undefined;
    }

    logger.info(`Session cookie found, (count: ${sessionCookies.length})`);
    return sessionCookies;
  }

  parseCookieFromArray(cookies: RequestCookie[]): string | undefined {
    const logger = fronteggLogger.child({ tag: 'CookieManager.parseCookieFromArray' });
    const cookieChunks = cookies.filter((c) => c.name.includes(this.getCookieName()));
    logger.info('Parsing session cookie from RequestCookie for Next.JS 13+');

    if (!cookieChunks || cookieChunks.length === 0) {
      logger.info(`No session cookies found`);
      return undefined;
    }
    logger.debug(`Found ${cookieChunks.length} chunks`);
    cookieChunks.sort((a, b) => {
      const firstCookieNumber = parseInt(a.name.slice(-1));
      const secondCookieNumber = parseInt(b.name.slice(-1));
      return firstCookieNumber > secondCookieNumber ? 1 : -1;
    });

    logger.info(`Concatenate session cookies chunks`);
    return cookieChunks.map((c) => c.value).join('');
  }

  private createEmptySingleCookie = (cookieName: string, isSecured: boolean, cookieDomain: string) => {
    return this.create({
      cookieName,
      value: '',
      expires: new Date(),
      secure: isSecured,
      domain: cookieDomain,
      silent: true,
    });
  };

  createEmptyCookies = (
    isSecured: boolean,
    cookieDomain: string,
    _cookiesToRemove: string[],
    removeRefresh = true
  ): string[] => {
    const allEmptyCookies: string[] = [];

    const refreshTokenVariants = getRefreshTokenCookieNameVariants();
    const cookiesToRemove = [..._cookiesToRemove, ...(removeRefresh ? refreshTokenVariants : [])];

    cookiesToRemove.forEach((name: string) => {
      allEmptyCookies.push(...this.createEmptySingleCookie(name, isSecured, cookieDomain));
    });

    return allEmptyCookies;
  };

  private getCookiesToRemove = (request?: RequestType): string[] => {
    const logger = fronteggLogger.child({ tag: 'getCookiesToRemove' });
    if (!request) {
      return [];
    }
    try {
      logger.info('extract cookie from request headers');
      const cookieStr = getCookieHeader(request);
      const cookies = cookieStr && cookieSerializer.parse(cookieStr);
      if (!cookies) {
        return [];
      }
      let cookieNumber = 1;
      const cookieToRemove = [];
      if (cookies[this.getCookieName()]) {
        cookieToRemove.push(this.getCookieName());
      }
      while (cookies[this.getCookieName(cookieNumber)]) {
        cookieToRemove.push(this.getCookieName(cookieNumber));
        cookieNumber++;
      }
      logger.info(`number of cookies to remove: ${cookieToRemove.length}`);
      return cookieToRemove;
    } catch (e) {
      logger.error(e);
      return [];
    }
  };

  /**
   * Take a list of cookieNames and modify request/response headers
   * to proxy the cookies from Next.js to Frontegg Services and vice-versa
   * @param {string[]} setCookieValue - list of cookies to modify
   * @param {boolean} isSecured - if the running application behind SSL
   */
  removeCookies({ cookieNames, isSecured, cookieDomain, res, req }: RemoveCookiesOptions): void {
    const logger = fronteggLogger.child({ tag: 'CookieManager.removeCookies' });
    logger.debug('Setting empty cookie headers remove cookies from client side');
    const cookiesToRemove = this.getCookiesToRemove(req);
    const cookieValue = this.createEmptyCookies(isSecured, cookieDomain, cookieNames ?? cookiesToRemove);
    let existingSetCookie = (res.getHeader('set-cookie') as string[] | string) ?? [];
    if (typeof existingSetCookie === 'string') {
      existingSetCookie = [existingSetCookie];
    }

    const setCookieHeaders = [...existingSetCookie, ...cookieValue];
    logger.debug(`removing headers (count: ${setCookieHeaders.length})`);
    res.setHeader('set-cookie', setCookieHeaders);
  }

  /**
   * Take a list of cookie headers and modify the Domain / Secure / SameSite
   * to proxy the cookies to Frontegg Services and vice-versa
   * @param {string[]} setCookieValue - list of cookies to modify
   * @param {boolean} isSecured - if the running application behind SSL
   */
  modifySetCookie = (setCookieValue: string[] | undefined, isSecured: boolean): string[] | undefined => {
    const logger = fronteggLogger.child({ tag: 'CookieManager.modifySetCookie' });
    if (!setCookieValue || setCookieValue.length === 0) {
      logger.info(`No headers to modify`);
      return setCookieValue;
    }

    // noinspection SuspiciousTypeOfGuard
    if (typeof setCookieValue === 'string') {
      const cookieRegexSplitter = /(.*?;.*?(?:Expires=[^;]+;.*?)?(?=,\s*\S+=|$))/g;
      const cookies = [];
      const cookieHeader = `${setCookieValue}`;
      let match;
      while ((match = cookieRegexSplitter.exec(cookieHeader)) !== null) {
        let cookieString = match[1].trim();
        if (cookieString.startsWith(',')) {
          cookies.push(cookieString.substring(1).trim());
        } else {
          cookies.push(cookieString);
        }
      }
      setCookieValue = cookies;
    }

    logger.info(`modifying cookie headers (count: ${setCookieValue.length})`);
    return setCookieValue.map((c) => {
      let cookie = c.split('; ');

      logger.debug(`modifying cookie ${cookie[0]}, isSecured: ${isSecured}`);
      if (!isSecured) {
        cookie = cookie.filter((property) => property !== 'Secure' && property !== 'SameSite=None');
      }

      return (
        cookie
          .map((property) => {
            if (property.trim().startsWith(`fe_refresh_${config.clientId.replace('-', '')}`)) {
              if (config.rewriteCookieByAppId && config.appId) {
                return property.replace(
                  `fe_refresh_${config.clientId.replace('-', '')}`,
                  `fe_refresh_${config.appId.replace('-', '')}`
                );
              } else {
                return property;
              }
            } else if (property.toLowerCase() === `domain=${config.baseUrlHost}`) {
              return `Domain=${config.cookieDomain}`;
            } else {
              return property;
            }
          })
          .join(';') + ';'
      );
    });
  };
}

export default new CookieManager();
