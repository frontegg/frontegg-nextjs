import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/api', () => ({ getPublicSettings: vi.fn() }));
vi.mock('../../../src/api/utils', () => ({ CUSTOM_LOGIN_HEADER: 'frontegg-login-alias' }));
vi.mock('../../../src/app/helpers', () => ({ getAppHeaders: vi.fn() }));

import { getPublicSettings } from '../../../src/api';
import { getAppHeaders } from '../../../src/app/helpers';
import {
  getAppUrlForCustomLoginWithSubdomain,
  getTenantAliasFromHeaders,
  resetGlobalCustomLoginAppUrl,
} from '../../../src/app/getAppUrlForCustomLoginWithSubdomain';

const mockedGetPublicSettings = vi.mocked(getPublicSettings);
const mockedGetAppHeaders = vi.mocked(getAppHeaders);

beforeEach(() => {
  (global as any).customLoginAppUrl = 'https://stale.example.com';
});

describe('getTenantAliasFromHeaders', () => {
  it('returns the subdomain at the given index, ignoring the registrable domain', () => {
    const headers = { host: 'eu.acme.example.com' };

    expect(getTenantAliasFromHeaders(headers, 0)).toBe('eu');
    expect(getTenantAliasFromHeaders(headers, 1)).toBe('acme');
  });

  it('returns undefined for a host without subdomains', () => {
    expect(getTenantAliasFromHeaders({ host: 'example.com' }, 0)).toBeUndefined();
  });

  it('returns undefined without a host header', () => {
    expect(getTenantAliasFromHeaders({}, 0)).toBeUndefined();
  });
});

describe('resetGlobalCustomLoginAppUrl', () => {
  it('clears the global custom login app url', () => {
    resetGlobalCustomLoginAppUrl();

    expect((global as any).customLoginAppUrl).toBeUndefined();
  });
});

describe('getAppUrlForCustomLoginWithSubdomain', () => {
  it('does nothing when no subdomain index is configured', async () => {
    const result = await getAppUrlForCustomLoginWithSubdomain(undefined);

    expect(result).toBeUndefined();
    expect(mockedGetAppHeaders).not.toHaveBeenCalled();
    expect((global as any).customLoginAppUrl).toBe('https://stale.example.com');
  });

  it('resolves and stores the tenant application url for a subdomain alias', async () => {
    mockedGetAppHeaders.mockResolvedValue({ host: 'acme.example.com', cookie: 'c' });
    mockedGetPublicSettings.mockResolvedValue({ applicationUrl: 'https://acme.example.com' } as any);

    const result = await getAppUrlForCustomLoginWithSubdomain(0);

    expect(mockedGetPublicSettings).toHaveBeenCalledWith({
      host: 'acme.example.com',
      cookie: 'c',
      'frontegg-login-alias': 'acme',
    });
    expect(result).toBe('https://acme.example.com');
    expect((global as any).customLoginAppUrl).toBe('https://acme.example.com');
  });

  it('resets the global url when the host has no alias at the index', async () => {
    mockedGetAppHeaders.mockResolvedValue({ host: 'example.com' });

    const result = await getAppUrlForCustomLoginWithSubdomain(0);

    expect(result).toBeUndefined();
    expect(mockedGetPublicSettings).not.toHaveBeenCalled();
    expect((global as any).customLoginAppUrl).toBeUndefined();
  });

  it('resets the global url when public settings cannot be fetched', async () => {
    mockedGetAppHeaders.mockResolvedValue({ host: 'acme.example.com' });
    mockedGetPublicSettings.mockRejectedValue(new Error('network'));

    const result = await getAppUrlForCustomLoginWithSubdomain(0);

    expect(result).toBeUndefined();
    expect((global as any).customLoginAppUrl).toBeUndefined();
  });

  it('resets the global url when the tenant has no application url', async () => {
    mockedGetAppHeaders.mockResolvedValue({ host: 'acme.example.com' });
    mockedGetPublicSettings.mockResolvedValue({} as any);

    const result = await getAppUrlForCustomLoginWithSubdomain(0);

    expect(result).toBeUndefined();
    expect((global as any).customLoginAppUrl).toBeUndefined();
  });
});
