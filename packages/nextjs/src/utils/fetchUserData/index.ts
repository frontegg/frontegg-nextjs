import { AllUserData, FronteggNextJSSession } from '../../types';
import { getTenants, getUsers } from '../../api';
import { calculateExpiresInFromExp } from '../common';
import fronteggLogger from '../fronteggLogger';

type FetchUserDataOptions = {
  getSession: () => Promise<FronteggNextJSSession | undefined | null>;
  getHeaders: () => Promise<Record<string, string | string[] | undefined>>;
};

export default async function fetchUserData(options: FetchUserDataOptions): Promise<AllUserData> {
  const { getSession, getHeaders } = options;

  const logger = fronteggLogger.child({ tag: 'fetchUserData.getAllUserData' });
  try {
    const session = await getSession();
    if (!session) {
      logger.info('No session found');
      return {};
    }

    const { accessToken } = session;
    const reqHeaders = await getHeaders();
    const headers = { ...reqHeaders, authorization: `Bearer ${accessToken}` };

    logger.debug('Retrieving user data...');
    const [baseUserResult, tenantsResult] = await Promise.allSettled([getUsers(headers), getTenants(headers)]);
    logger.debug(
      'Retrieved user data:',
      'baseUserResult: ',
      baseUserResult.status,
      'tenantsResult:',
      tenantsResult.status
    );

    const baseUser = baseUserResult.status === 'fulfilled' ? baseUserResult.value : null;
    const tenants = tenantsResult.status === 'fulfilled' ? tenantsResult.value : null;

    if (!baseUser || !tenants) {
      logger.info('No base user or tenants found');
      return {};
    }

    const user = {
      ...session.user,
      ...baseUser!,
      expiresIn: calculateExpiresInFromExp(session.user.exp),
    };

    logger.info('Retrieved all user data successfully');

    return { user, session, tenants };
  } catch (e: any) {
    logger.error(e.message, e);
    return {};
  }
}
