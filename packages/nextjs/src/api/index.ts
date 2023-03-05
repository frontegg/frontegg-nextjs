import config from '../config';
import { ApiUrls } from './urls';
import { buildRequestHeaders, Get, parseHttpResponse, Post } from './utils';
import { fronteggTenantsUrl, fronteggUsersUrl, ILoginResponse, ITenantsResponse } from '@frontegg/rest-api';

/**
 * Send HTTP GET to frontegg domain public route to download the JWT public key
 */
const loadPublicKey = async () => {
  const response = await fetch(`${config.baseUrl}${ApiUrls.WellKnown.jwks}`, {
    cache: 'force-cache',
  });
  const data = await response.json();
  return data.keys[0];
};

/**
 * Send HTTP post request for Frontegg services to refresh token
 * by providing client's fe_ cookies
 */
const refreshTokenEmbedded = async (headers: Record<string, string>) => {
  return Post({
    url: `${config.baseUrl}${ApiUrls.refreshToken.embedded}`,
    body: '{}',
    headers: buildRequestHeaders(headers),
  });
};

/**
 * Send HTTP post request for Frontegg services to refresh `hosted login` token
 * by providing client's fe_ as body with grant_type.
 */
const refreshTokenHostedLogin = async (headers: Record<string, string>, refresh_token: string) => {
  return Post({
    url: `${config.baseUrl}${ApiUrls.refreshToken.hosted}`,
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token,
    }),
    headers: buildRequestHeaders(headers, { cookie: headers['cookie'] }),
  });
};

/**
 *
 * @param headers
 */
export const getUsers = async (headers: Record<string, string>): Promise<ILoginResponse | undefined> => {
  const headersToSend = buildRequestHeaders(headers);
  const res = await Get({
    url: `${config.baseUrl}/frontegg${fronteggUsersUrl}`,
    headers: headersToSend,
  });
  return parseHttpResponse(res);
};

/**
 *
 * @param headers
 */
export const getTenants = async (headers: Record<string, string>): Promise<ITenantsResponse[] | undefined> => {
  const res = await Get({
    url: `${config.baseUrl}/frontegg${fronteggTenantsUrl}`,
    headers: buildRequestHeaders(headers),
  });
  return parseHttpResponse(res);
};

export default {
  loadPublicKey,
  refreshTokenEmbedded,
  refreshTokenHostedLogin,
  getUsers,
  getTenants,
};
