import { getTenants, getUsers } from './api';
import { MeAndTenantsResponse } from './types';

export async function getMeAndTenants(
  reqHeaders?: Record<string, string | string[] | null | undefined>,
  accessToken?: string
): Promise<MeAndTenantsResponse> {
  if (!reqHeaders || !accessToken) {
    return {};
  }
  const headers = { ...reqHeaders, Authorization: `Bearer ${accessToken}` };
  const [user, tenants] = await Promise.all([getUsers(headers), getTenants(headers)]);

  return { user, tenants };
}
