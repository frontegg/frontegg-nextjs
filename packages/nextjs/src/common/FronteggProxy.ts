import httpProxy from 'http-proxy';
import { fronteggAuthApiRoutes } from '@frontegg/rest-api';

/**
 * @see https://www.npmjs.com/package/http-proxy
 */
export const FronteggProxy = httpProxy.createProxyServer({
  target: process.env['FRONTEGG_BASE_URL'],
  autoRewrite: false,
  followRedirects: true,
});

/**
 * Please refer to the following links for the specification document for HTTP.
 * @see https://tools.ietf.org/html/rfc7231
 * @see https://en.wikipedia.org/wiki/Hypertext_Transfer_Protocol
 */

export const hasRequestBodyMethods: string[] = ['HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'PATCH'];

/**
 * If pattern information matching the input url information is found in the `pathRewrite` array,
 * the url value is partially replaced with the `pathRewrite.replaceStr` value.
 * @param url
 * @param pathRewrite
 */
export const rewritePath = (
  url: string,
  pathRewrite: { [key: string]: string } | { patternStr: string; replaceStr: string }[]
) => {
  if (Array.isArray(pathRewrite)) {
    for (const item of pathRewrite) {
      const { patternStr, replaceStr } = item;
      const pattern = RegExp(patternStr);
      if (pattern.test(url as string)) {
        return url.replace(pattern, replaceStr);
      }
    }
  } else {
    // tslint:disable-next-line:forin
    for (const patternStr in pathRewrite) {
      const pattern = RegExp(patternStr);
      const path = pathRewrite[patternStr];
      if (pattern.test(url as string)) {
        return url.replace(pattern, path);
      }
    }
  }
  return url;
};

export const fronteggPathRewrite = [
  {
    patternStr: '^/api/',
    replaceStr: '/',
  },
];

export const isFronteggLogoutUrl = (url: string) => {
  return (
    fronteggAuthApiRoutes.filter((path) => path.endsWith('/logout')).findIndex((route) => url.endsWith(route)) >= 0
  );
};
