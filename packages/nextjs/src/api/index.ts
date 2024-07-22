import config from '../config';
import { ApiUrls } from './urls';
import { buildRequestHeaders, Get, parseHttpResponse, Post } from './utils';
import {
  fronteggTenantsV3Url,
  fronteggUsersUrl,
  ILoginResponse,
  GetCurrentUserTenantsResponse,
  IPublicSettingsResponse,
  IGetUserAuthorizationResponse,
  fronteggEntitlementsV2Url,
} from '@frontegg/rest-api';

import { UserEntitlementsResponseV2 } from '@frontegg/types';

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
    credentials: 'include',
    headers: buildRequestHeaders(headers),
  });
};

/**
 * Send HTTP post request for Frontegg services to refresh `hosted login` token
 * by providing client's fe_ as body with grant_type.
 */
const refreshTokenHostedLogin = async (
  headers: Record<string, string>,
  refresh_token: string,
  cliendId?: string,
  clientSecret?: string
) => {
  return Post({
    url: `${config.baseUrl}${ApiUrls.refreshToken.hosted}`,
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: cliendId,
      client_secret: clientSecret,
    }),
    headers: buildRequestHeaders(headers),
  });
};

/**
 * Send HTTP post request for Frontegg services to exchange `hosted login` callback code
 */
export const exchangeHostedLoginToken = async (
  headers: Record<string, string>,
  code: string,
  cliendId: string,
  clientSecret: string
) => {
  return Post({
    url: `${config.baseUrl}${ApiUrls.refreshToken.hosted}`,
    body: JSON.stringify({
      redirect_uri: `${config.appUrl}/oauth/callback`,
      grant_type: 'authorization_code',
      code,
      client_id: cliendId,
      client_secret: clientSecret,
      // code_verifier
    }),
    headers: buildRequestHeaders(headers),
  });
};

/**
 *
 * @param headers
 */
export const getMe = async (headers: Record<string, string>): Promise<ILoginResponse | undefined> => {
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
export const getEntitlements = async (
  headers: Record<string, string>
): Promise<UserEntitlementsResponseV2 | undefined> => {
  const headersToSend = buildRequestHeaders(headers);
  const res = await Get({
    url: `${config.baseUrl}${fronteggEntitlementsV2Url}`,
    headers: headersToSend,
  });
  return parseHttpResponse(res);
};

/**
 *
 * @param headers
 */
export const getTenants = async (
  headers: Record<string, string>
): Promise<GetCurrentUserTenantsResponse | undefined> => {
  const res = await Get({
    url: `${config.baseUrl}/frontegg${fronteggTenantsV3Url}`,
    headers: buildRequestHeaders(headers),
  });
  return parseHttpResponse(res);
};

/**
 *
 * @param headers
 */
export const getMeAuthorization = async (
  headers: Record<string, string>
): Promise<IGetUserAuthorizationResponse | undefined> => {
  const res = await Get({
    //TODO: replace this with rest/api route
    url: `${config.baseUrl}/frontegg/identity/resources/users/v1/me/authorization`,
    headers: buildRequestHeaders(headers),
  });
  return parseHttpResponse(res);
};

export const getPublicSettings = async (
  headers: Record<string, string>
): Promise<IPublicSettingsResponse | undefined> => {
  const res = await Get({
    //TODO: export the route url from rest-api and import from there
    url: `${config.baseUrl}/frontegg/tenants/resources/account-settings/v1/public`,
    headers: buildRequestHeaders(headers),
  });
  return parseHttpResponse(res);
};

export default {
  loadPublicKey,
  refreshTokenEmbedded,
  refreshTokenHostedLogin,
  getMe,
  getTenants,
  getPublicSettings,
  getEntitlements,
  exchangeHostedLoginToken,
};
