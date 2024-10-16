import { AllUserData, FronteggNextJSSession } from '../../types';
import { getTenants, getMe, getMeAuthorization, getEntitlements } from '../../api';
import { calculateExpiresInFromExp } from '../common';
import fronteggLogger from '../fronteggLogger';
import config from '../../config';

const FULFILLED_STATUS = 'fulfilled';

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
    const headers: Record<string, string> = { ...reqHeaders, authorization: `Bearer ${accessToken}` };

    if (config.appId) {
      headers['frontegg-requested-application-id'] = config.appId;
    }

    logger.debug('Retrieving user data...');
    const [baseUserResult, tenantsResult, entitlementsResult, meAuthorizationResult] = await Promise.allSettled([
      getMe(headers),
      getTenants(headers),
      getEntitlements(headers),
      getMeAuthorization(headers),
    ]);

    logger.debug(
      'Retrieved user data:',
      'baseUserResult: ',
      baseUserResult.status,
      'tenantsResult:',
      tenantsResult.status,
      'entitlements:',
      entitlementsResult.status
    );

    const baseUser = baseUserResult.status === FULFILLED_STATUS ? baseUserResult.value : null;
    const tenantsResponse = tenantsResult.status === FULFILLED_STATUS ? tenantsResult.value : null;
    const meAuthorizationResponse =
      meAuthorizationResult.status === FULFILLED_STATUS ? meAuthorizationResult.value : null;
    const entitlementsResponse = entitlementsResult.status === FULFILLED_STATUS ? entitlementsResult.value : undefined;

    if (!baseUser || !tenantsResponse) {
      logger.info('No base user or tenants found');
      return {};
    }

    const user = {
      ...session.user,
      ...baseUser!,
      ...meAuthorizationResponse,
      entitlements: entitlementsResponse,
      expiresIn: calculateExpiresInFromExp(session.user.exp),
    };

    logger.info('Retrieved all user data successfully');

    const { tenants, activeTenant } = tenantsResponse;
    return { user, session, tenants, activeTenant };
  } catch (e: any) {
    // logger.error(e.message, e);
    return {};
  }
}
