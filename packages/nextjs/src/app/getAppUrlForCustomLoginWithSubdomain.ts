import { headers } from 'next/headers';
import { getPublicSettings } from '../api';

export const getAppUrlForCustomLoginWithSubdomain = async (subDomainIndex: number) => {
  try {
    const reqHeaders: Record<string, string> = {};
    const headersInstance = headers();
    headersInstance.forEach((value, key) => (reqHeaders[key] = value));
    const alias = headersInstance?.get('host')?.split('.')?.slice(0, -2)[subDomainIndex];
    const res = await getPublicSettings(reqHeaders, alias);
    return res?.applicationUrl;
  } catch {}
};
