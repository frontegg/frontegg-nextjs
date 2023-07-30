import { getPublicSettings } from '../api';
import { getAppHeaders } from './helpers';

/**
 * get the tenant alias from the request headers with the host and subdomain index
 * @param headers - the request headers
 * @param subDomainIndex - the subdomain index to specify the tenant sub-domain
 * @returns the alias for custom login with subdomain or undefined if not exist
 */
const getTenantAliasFromHeaders = (headers: Record<string, string>, subDomainIndex: number) => {
  return headers?.host?.split('.')?.slice(0, -2)?.[subDomainIndex];
};

/**
 * set the global.customLoginAppUrl to undefined in order to allow switching from tenant to vendor app
 */
const resetGlobalCustomLoginAppUrl = () => {
  global.customLoginAppUrl = undefined;
};

/**
 * get the app url for custom login with subdomain and set it to the global customLoginAppUrl
 * @param subDomainIndex - the index of the subdomain in the host
 * @returns Promise of string or undefined, the app url for custom login with subdomain or undefined if the sub-domain index/app url/alias is not exist
 * @sideEffect - set the global.customLoginAppUrl to the app url for custom login with subdomain */

export const getAppUrlForCustomLoginWithSubdomain = async (subDomainIndex?: number): Promise<string | undefined> => {
  if (subDomainIndex === undefined) {
    return undefined;
  }

  const headers = getAppHeaders();
  const alias = getTenantAliasFromHeaders(headers, subDomainIndex);
  if (!alias) {
    resetGlobalCustomLoginAppUrl();
    return undefined;
  }
  const res = await getPublicSettings(headers, alias).catch(() => undefined);
  const subDomainAppUrl = res?.applicationUrl;
  if (!subDomainAppUrl) {
    resetGlobalCustomLoginAppUrl();
    return undefined;
  }
  global.customLoginAppUrl = subDomainAppUrl;
  return subDomainAppUrl;
};
