import { BuildRouteResult, buildLogoutRoute } from '../api/urls';
import config from '../config';
import { defaultFronteggRoutes } from '../utils/routing';

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

/**
 * Checks If route is a logout route
 * @param url
 */
export const isFronteggLogoutUrl = (url: string) => url.endsWith('/logout');

/**
 * Checks If route is a hosted logout route
 * @param url
 */
export const isFronteggOauthLogoutUrl = (url: string) => url.endsWith('/oauth/logout');

/**
 * Returns url to be redirected for hosted logout
 * @param referer the route to redirect to after logout
 */
export const getHostedLogoutUrl = (referer = config.appUrl): BuildRouteResult => {
  const logoutPath = config.authRoutes?.logoutUrl ?? defaultFronteggRoutes.logoutUrl;
  const refererUrl = new URL(referer);
  const isLogoutRoute = refererUrl.toString().includes(logoutPath);

  const redirectUrl = isLogoutRoute ? refererUrl.origin + refererUrl.search : refererUrl.toString();

  return buildLogoutRoute(redirectUrl, config.baseUrl);
};

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

/**
 * Extracts the access token from the response body
 * @param bodyStr
 */
export const extractAccessToken = (bodyStr: string): Tokens => {
  const body = JSON.parse(bodyStr);

  if (body.authResponse) {
    Object.assign(body, body.authResponse);
  }
  return {
    accessToken: body.accessToken || body.access_token,
    refreshToken: body.refreshToken || body.refresh_token,
  };
};

const jwtKeys = ['accessToken', 'access_token', 'idToken', 'id_token'];
const refreshTokenKeys = ['refreshToken', 'refresh_token'];
/**
 * Removes the signature from the JWT token
 * @param body
 */
export const removeJwtSignatureFrom = <T extends any>(body: any): T => {
  if (!body) {
    return body;
  }

  if (body.authResponse) {
    jwtKeys.forEach((key) => {
      if (body.authResponse[key]) {
        // body.authResponse[key] = "REDACTED_FOR_SECURITY";
        // body.authResponse[key] = body.authResponse[key].split('.')[0] + '.' + body.authResponse[key].split('.')[1];
        body.authResponse[key] = `REDACTED_FOR_SECURITY.${body.authResponse[key].split('.')[1]}.REDACTED_FOR_SECURITY`;
      }
    });
    refreshTokenKeys.forEach((key) => {
      if (body.authResponse[key]) {
        delete body.authResponse[key];
      }
    });
  }

  jwtKeys.forEach((key) => {
    if (body[key]) {
      // body[key] = "REDACTED_FOR_SECURITY";
      // body[key] = body[key].split('.')[0] + '.' + body[key].split('.')[1];
      body[key] = `REDACTED_FOR_SECURITY.${body[key].split('.')[1]}.REDACTED_FOR_SECURITY`;
    }
  });
  refreshTokenKeys.forEach((key) => {
    if (body[key]) {
      delete body[key];
    }
  });
  return body;
};

export const isInternalRequest = (host: string) => config.appUrl.includes(host);
