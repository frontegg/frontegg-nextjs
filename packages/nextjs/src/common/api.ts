import { fronteggTenantsUrl, fronteggUsersUrl, ILoginResponse, ITenantsResponse } from '@frontegg/rest-api';

const BASE_URL = `${process.env['FRONTEGG_BASE_URL']}/frontegg`;
const Get = ({
  url,
  credentials = 'include',
  headers,
}: {
  url: string;
  credentials?: RequestCredentials;
  headers?: HeadersInit;
}) => fetch(url, { method: 'GET', credentials, headers });

const extractHeaders = (headers: Record<string, string>) => ({
  'accept-encoding': headers['accept-encoding'],
  'accept-language': headers['accept-language'],
  cookie: headers['cookie'],
  accept: headers['accept'],
  'user-agent': headers['user-agent'],
  // connection: headers['connection'],
  'cache-control': headers['cache-control'],
  Authorization: headers['Authorization'],
});

const parseResponse = async <T>(res: Response): Promise<T | undefined> => {
  if (!res.ok) {
    return undefined;
  }
  const resText = await res.text();
  return JSON.parse(resText);
};

export const getUsers = async (headers: Record<string, string>): Promise<ILoginResponse | undefined> => {
  const res = await Get({ url: `${BASE_URL}${fronteggUsersUrl}`, headers: extractHeaders(headers) });
  return parseResponse(res);
};

export const getTenants = async (headers: Record<string, string>): Promise<ITenantsResponse[] | undefined> => {
  const res = await Get({ url: `${BASE_URL}${fronteggTenantsUrl}`, headers: extractHeaders(headers) });
  return parseResponse(res);
};
