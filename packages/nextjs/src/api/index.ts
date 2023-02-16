import config from '../config';
import { ApiUrls } from './urls';
import { buildRequestHeaders } from './utils';
import { fronteggTenantsUrl, fronteggUsersUrl, ILoginResponse, ITenantsResponse } from "@frontegg/rest-api";

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
    headers: buildRequestHeaders(headers),
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
    headers: buildRequestHeaders(headers, { cookie: headers['cookie'] }),
  });
};


/**
 *
 * @param headers
 */
export const getUsers = async (headers: Record<string, string>): Promise<ILoginResponse | undefined> => {
  const res = await Get({ url: `${BASE_URL}${fronteggUsersUrl}`, headers: extractHeaders(headers) });
  return parseResponse(res);
};

export const getTenants = async (headers: Record<string, string>): Promise<ITenantsResponse[] | undefined> => {
  const res = await Get({ url: `${BASE_URL}${fronteggTenantsUrl}`, headers: extractHeaders(headers) });
  return parseResponse(res);
};


export default {
  loadPublicKey,
  refreshTokenEmbedded,
  refreshTokenHostedLogin,
};
