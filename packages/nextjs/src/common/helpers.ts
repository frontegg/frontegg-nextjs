import cookie, { CookieSerializeOptions } from 'cookie';
import { ServerResponse } from 'http';
import { sealData, unsealData } from 'iron-session';
import { jwtVerify } from 'jose';
import { RequestCookie } from 'next/dist/server/web/spec-extension/cookies';
import fronteggConfig from './FronteggConfig';
import { FronteggUserTokens } from './types';

export function rewriteCookieProperty(header: string | string[], config: any, property: string): string | string[] {
  if (Array.isArray(header)) {
    return header.map((headerElement) => {
      return rewriteCookieProperty(headerElement, config, property);
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

type CreateCookieArguments = {
  cookieName?: string;
  session: string;
  expires: CookieSerializeOptions['expires'];
  isSecured: CookieSerializeOptions['secure'];
  cookieDomain?: CookieSerializeOptions['domain'];
  httpOnly?: CookieSerializeOptions['httpOnly'];
  path?: CookieSerializeOptions['path'];
};
const COOKIE_MAX_LENGTH = 4096;

export function createCookie({
  cookieName = fronteggConfig.cookieName,
  session,
  expires,
  isSecured,
  cookieDomain = fronteggConfig.cookieDomain,
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
  const cookieValue = cookie.serialize(cookieName, session, options);
  if (cookieValue.length < COOKIE_MAX_LENGTH) {
    return [cookieValue];
  }
  return createSplitCookie(cookieName, session, options, cookieValue.length);
}

function createSplitCookie(cookieName: string, session: string, options: CookieSerializeOptions, cookieLength: number) {
  const numberOfCookies = Math.ceil(cookieLength / COOKIE_MAX_LENGTH);
  const splitSession = chunkString(session, numberOfCookies);
  const allCookies: string[] = [];
  for (let i = 1; i <= numberOfCookies; i++) {
    allCookies.push(cookie.serialize(`${cookieName}-${i}`, splitSession[i - 1], options));
  }
  return allCookies;
}

function chunkString(str: string, numChunks: number) {
  const chunkSize = Math.ceil(str.length / numChunks);
  const chunks: string[] = [];
  for (let i = 0; i < numChunks; i + chunkSize) {
    const limit = i + chunkSize;
    chunks.push(str.substring(i, limit < str.length ? limit : str.length));
  }
  return chunks;
}

export function parseCookieFromArray(cookies: RequestCookie[]): string | undefined {
  const userCookie = cookies.find((c) => c.name === fronteggConfig.cookieName);
  if (userCookie) {
    return userCookie.value;
  }
  const cookieChunks = cookies.filter((c) => c.name.includes(fronteggConfig.cookieName));
  if (!cookieChunks) {
    return undefined;
  }
  cookieChunks.sort((a, b) => (parseInt(a.name) > parseInt(b.name) ? 1 : -1));
  return cookieChunks.map((c) => c.value).join();
}

export function addToCookies(newCookies: string[], res: ServerResponse) {
  let existingSetCookie = (res.getHeader('set-cookie') as string[] | string) ?? [];
  if (typeof existingSetCookie === 'string') {
    existingSetCookie = [existingSetCookie];
  }
  res.setHeader('set-cookie', [...existingSetCookie, ...newCookies]);
}

export function removeCookies(cookieName: string, isSecured: boolean, cookieDomain: string, res: ServerResponse) {
  const cookieValue = createCookie({ cookieName, session: '', expires: new Date(), isSecured, cookieDomain });
  let existingSetCookie = (res.getHeader('set-cookie') as string[] | string) ?? [];
  if (typeof existingSetCookie === 'string') {
    existingSetCookie = [existingSetCookie];
  }
  res.setHeader('set-cookie', [...existingSetCookie, ...cookieValue]);
}

export async function createSessionFromAccessToken(output: string): Promise<[string, any, string] | []> {
  try {
    const data = JSON.parse(output);
    const accessToken = data?.accessToken ?? data.access_token;
    const refreshToken = data?.refreshToken ?? data.refresh_token;
    const publicKey = await fronteggConfig.getJwtPublicKey();
    const { payload: decodedJwt }: any = await jwtVerify(accessToken, publicKey);
    decodedJwt.expiresIn = Math.floor((decodedJwt.exp * 1000 - Date.now()) / 1000);

    const stringifySession = JSON.stringify({ accessToken, refreshToken });
    const session = await sealData(stringifySession, {
      password: fronteggConfig.passwordsAsMap,
      ttl: decodedJwt.exp,
    });
    return [session, decodedJwt, refreshToken];
  } catch (e) {
    return [];
  }
}

export const modifySetCookieIfUnsecure = (
  setCookieValue: string[] | undefined,
  isSecured: boolean
): string[] | undefined => {
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

export async function getTokensFromCookie(cookie?: string): Promise<FronteggUserTokens | undefined> {
  if (!cookie) {
    return undefined;
  }
  const stringifyJwt: string = await unsealData(cookie, {
    password: fronteggConfig.passwordsAsMap,
  });
  return JSON.parse(stringifyJwt);
}
