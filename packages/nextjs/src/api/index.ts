import config from '../config';
import { ApiUrls } from './urls';
import { fronteggRefreshTokenUrl } from '@frontegg/rest-api';
import nextjsPkg from 'next/package.json';
import sdkVersion from '../sdkVersion';
import { removeInvalidHeaders } from './utils';

/**
 * Send HTTP GET to frontegg domain public route to download the JWT public key
 */
const loadPublicKey = async () => {
  const response = await fetch(`${config.baseUrl}${ApiUrls.WellKnown.jwks}`);
  const data = await response.json();
  return data.keys[0];
};

/**
 * Send HTTP post request for Frontegg services to refresh token
 * by providing client's fe_ cookies
 */
const refreshTokenEmbedded = async (headers: Record<string, string>) => {
  return fetch(`${config.baseUrl}${ApiUrls.refreshToken.embedded}`, {
    method: 'POST',
    credentials: 'include',
    body: '{}',
    headers: removeInvalidHeaders({
      'accept-encoding': headers['accept-encoding'],
      'accept-language': headers['accept-language'],
      cookie: headers['cookie'],
      accept: headers['accept'],
      'content-type': 'application/json',
      origin: config.baseUrl,
      'user-agent': headers['user-agent'],
      'cache-control': headers['cache-control'],
      'x-frontegg-framework': `next@${nextjsPkg.version}`,
      'x-frontegg-sdk': `@frontegg/nextjs@${sdkVersion.version}`,
    }),
  });
};

/**
 * Send HTTP post request for Frontegg services to refresh `hosted login` token
 * by providing client's fe_ as body with grant_type.
 */
const refreshTokenHostedLogin = async (headers: Record<string, string>, refresh_token: string) => {
  return fetch(`${config.baseUrl}${ApiUrls.refreshToken.hosted}`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token,
    }),
    headers: removeInvalidHeaders({
      'accept-encoding': headers['accept-encoding'],
      'accept-language': headers['accept-language'],
      accept: headers['accept'],
      'content-type': 'application/json',
      origin: config.baseUrl,
      'user-agent': headers['user-agent'],
      'cache-control': headers['cache-control'],
      'x-frontegg-framework': `next@${nextjsPkg.version}`,
      'x-frontegg-sdk': `@frontegg/nextjs@${sdkVersion.version}`,
    }),
  });
};

export default {
  loadPublicKey,
  refreshTokenEmbedded,
  refreshTokenHostedLogin
};
