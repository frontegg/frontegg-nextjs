import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FronteggNextJSSession } from '../../../../src/types';

const mockConfig = vi.hoisted(() => ({
  appId: undefined as string | undefined,
  shouldForwardIp: false,
}));
const mockApi = vi.hoisted(() => ({
  getMe: vi.fn(),
  getTenants: vi.fn(),
  getEntitlements: vi.fn(),
  getMeAuthorization: vi.fn(),
}));

vi.mock('../../../../src/config', () => ({ default: mockConfig }));
vi.mock('../../../../src/api', () => mockApi);

import fetchUserData from '../../../../src/utils/fetchUserData';
import { FRONTEGG_APPLICATION_ID_HEADER, FRONTEGG_FORWARD_IP_HEADER } from '../../../../src/api/utils';

const NOW_MS = new Date('2026-06-01T12:00:00Z').getTime();
const NOW_SEC = NOW_MS / 1000;
const EXPIRES_IN_SEC = 300;

const SESSION = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: { sub: 'user-1', email: 'jwt@example.com', exp: NOW_SEC + EXPIRES_IN_SEC, tenantId: 't-1' },
} as unknown as FronteggNextJSSession;

const BASE_USER = { id: 'user-1', email: 'me@example.com', name: 'Me' };
const TENANTS = { tenants: [{ tenantId: 't-1' }, { tenantId: 't-2' }], activeTenant: { tenantId: 't-1' } };
const AUTHORIZATION = { roles: [{ key: 'admin' }], permissions: [{ key: 'read' }] };
const ENTITLEMENTS = { features: { sso: { isEntitled: true } }, permissions: {} };

const run = (headers: Record<string, string | string[] | undefined> = {}, session: any = SESSION) =>
  fetchUserData({ getSession: vi.fn().mockResolvedValue(session), getHeaders: vi.fn().mockResolvedValue(headers) });

const sentHeaders = () => mockApi.getMe.mock.calls[0][0] as Record<string, string>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW_MS);
  Object.assign(mockConfig, { appId: undefined, shouldForwardIp: false });
  mockApi.getMe.mockReset().mockResolvedValue(BASE_USER);
  mockApi.getTenants.mockReset().mockResolvedValue(TENANTS);
  mockApi.getEntitlements.mockReset().mockResolvedValue(ENTITLEMENTS);
  mockApi.getMeAuthorization.mockReset().mockResolvedValue(AUTHORIZATION);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchUserData', () => {
  it('returns an empty object and makes no api calls when there is no session', async () => {
    // Arrange
    const getHeaders = vi.fn();

    // Act
    const result = await fetchUserData({ getSession: vi.fn().mockResolvedValue(null), getHeaders });

    // Assert
    expect(result).toEqual({});
    expect(getHeaders).not.toHaveBeenCalled();
    expect(mockApi.getMe).not.toHaveBeenCalled();
  });

  it('merges session, profile, authorization and entitlements into the user and returns tenants', async () => {
    // Act
    const result = await run();

    // Assert
    expect(result).toEqual({
      session: SESSION,
      user: {
        ...SESSION.user,
        ...BASE_USER,
        ...AUTHORIZATION,
        entitlements: ENTITLEMENTS,
        expiresIn: EXPIRES_IN_SEC,
      },
      tenants: TENANTS.tenants,
      activeTenant: TENANTS.activeTenant,
    });
  });

  it('lets the /me profile override overlapping jwt claims', async () => {
    const result = await run();

    expect(result.user?.email).toBe('me@example.com');
  });

  it('calls every endpoint with the request headers plus a bearer authorization header', async () => {
    // Act
    await run({ cookie: 'a=1', authorization: 'Bearer old' });

    // Assert
    const expected = { cookie: 'a=1', authorization: 'Bearer access-token' };
    [mockApi.getMe, mockApi.getTenants, mockApi.getEntitlements, mockApi.getMeAuthorization].forEach((fn) => {
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(expected);
    });
  });

  it('adds the requested application id header when an appId is configured', async () => {
    mockConfig.appId = 'app-123';

    await run();

    expect(sentHeaders()[FRONTEGG_APPLICATION_ID_HEADER]).toBe('app-123');
  });

  it('does not add the application id header when no appId is configured', async () => {
    await run();

    expect(sentHeaders()).not.toHaveProperty(FRONTEGG_APPLICATION_ID_HEADER);
  });

  describe('ip forwarding', () => {
    it('does not add the forwarded ip header when shouldForwardIp is disabled', async () => {
      await run({ 'x-forwarded-for': '1.1.1.1' });

      expect(sentHeaders()).not.toHaveProperty(FRONTEGG_FORWARD_IP_HEADER);
    });

    it.each([
      [{ 'cf-connecting-ip': '1.1.1.1', 'x-vercel-proxied-for': '2.2.2.2', 'x-real-ip': '3.3.3.3' }, '1.1.1.1'],
      [{ 'x-vercel-proxied-for': '2.2.2.2', 'x-real-ip': '3.3.3.3', 'x-forwarded-for': '4.4.4.4' }, '2.2.2.2'],
      [{ 'x-real-ip': '3.3.3.3', 'x-forwarded-for': '4.4.4.4' }, '3.3.3.3'],
      [{ 'x-forwarded-for': '4.4.4.4, 5.5.5.5' }, '4.4.4.4'],
      [{ 'x-forwarded-for': ['6.6.6.6', '7.7.7.7'] }, '6.6.6.6'],
    ])('forwards the client ip by header precedence (%o -> %s)', async (headers, expectedIp) => {
      mockConfig.shouldForwardIp = true;

      await run(headers);

      expect(sentHeaders()[FRONTEGG_FORWARD_IP_HEADER]).toBe(expectedIp);
    });

    it('does not add the forwarded ip header when no client ip is available', async () => {
      mockConfig.shouldForwardIp = true;

      await run({});

      expect(sentHeaders()).not.toHaveProperty(FRONTEGG_FORWARD_IP_HEADER);
    });
  });

  it('returns an empty object when the /me request fails', async () => {
    mockApi.getMe.mockRejectedValue(new Error('500'));

    await expect(run()).resolves.toEqual({});
  });

  it('returns an empty object when /me returns no user', async () => {
    mockApi.getMe.mockResolvedValue(undefined);

    await expect(run()).resolves.toEqual({});
  });

  it('returns an empty object when the tenants request fails', async () => {
    mockApi.getTenants.mockRejectedValue(new Error('500'));

    await expect(run()).resolves.toEqual({});
  });

  it('returns an empty object when tenants returns nothing', async () => {
    mockApi.getTenants.mockResolvedValue(undefined);

    await expect(run()).resolves.toEqual({});
  });

  it('still returns the user with undefined entitlements when the entitlements request fails', async () => {
    mockApi.getEntitlements.mockRejectedValue(new Error('500'));

    const result = await run();

    expect(result.user).toBeDefined();
    expect(result.user?.entitlements).toBeUndefined();
    expect(result.tenants).toEqual(TENANTS.tenants);
  });

  it('still returns the user without roles when the authorization request fails', async () => {
    mockApi.getMeAuthorization.mockRejectedValue(new Error('500'));

    const result = await run();

    expect(result.user).toBeDefined();
    expect(result.user).not.toHaveProperty('roles');
    expect(result.user?.email).toBe('me@example.com');
  });

  it('returns an empty object when reading the session throws', async () => {
    const result = await fetchUserData({
      getSession: vi.fn().mockRejectedValue(new Error('boom')),
      getHeaders: vi.fn(),
    });

    expect(result).toEqual({});
  });

  it('returns an empty object when reading the request headers throws', async () => {
    const result = await fetchUserData({
      getSession: vi.fn().mockResolvedValue(SESSION),
      getHeaders: vi.fn().mockRejectedValue(new Error('headers() outside request scope')),
    });

    expect(result).toEqual({});
    expect(mockApi.getMe).not.toHaveBeenCalled();
  });
});
