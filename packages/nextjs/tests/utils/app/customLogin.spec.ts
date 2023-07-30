import { test, expect } from '@playwright/test';
import {
  getTenantAliasFromHeaders,
  resetGlobalCustomLoginAppUrl,
  getAppUrlForCustomLoginWithSubdomain,
} from '../../../src/app/getAppUrlForCustomLoginWithSubdomain';

test.describe('custom login with sub-domain tests', () => {
  test('test getTenantAliasFromHeaders returns the correct tenant alias from the host sub-domain', () => {
    const testAlias = getTenantAliasFromHeaders({ host: 'test.frontegg.com' }, 0);
    expect(testAlias).toBe('test');

    const noAlias = getTenantAliasFromHeaders({ host: 'frontegg.com' }, 0);
    expect(noAlias).toBe(undefined);

    const subdomainAlias = getTenantAliasFromHeaders({ host: 'alot.of.subdomain,test.frontegg.com' }, 2);
    expect(subdomainAlias).toBe(subdomainAlias);
  });

  test('resetGlobalCustomLoginAppUrl should remove the customLoginAppUrl from global var', () => {
    global.customLoginAppUrl = 'test';
    expect(global.customLoginAppUrl).toBe('test');
    resetGlobalCustomLoginAppUrl();
    expect(global.customLoginAppUrl).toBe(undefined);
  });

  test('getAppUrlForCustomLoginWithSubdomain should return undefined if no sub-domain index is passed', async () => {
    const appUrl = await getAppUrlForCustomLoginWithSubdomain(undefined);
    expect(appUrl).toBe(undefined);
  });
});
