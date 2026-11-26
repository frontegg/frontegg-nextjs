import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/utils/jwt', () => ({ default: { verify: vi.fn() } }));
vi.mock('../../../src/utils/encryption', () => ({ default: { sealTokens: vi.fn(), unsealTokens: vi.fn() } }));

import JwtManager from '../../../src/utils/jwt';
import encryption from '../../../src/utils/encryption';
import { getAfterAuthRedirectUrl } from '../../../src/common/helpers';
import { createSessionFromAccessToken, getTokensFromCookie } from '../../../src/utils/sessionTokens';

const mockedVerify = vi.mocked(JwtManager.verify);
const mockedSeal = vi.mocked(encryption.sealTokens);
const mockedUnseal = vi.mocked(encryption.unsealTokens);

const NOW = new Date('2026-01-01T00:00:00.000Z');
const EXP = NOW.getTime() / 1000 + 3600;

describe('createSessionFromAccessToken', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mockedVerify.mockResolvedValue({ payload: { exp: EXP, sub: 'u' } } as any);
    mockedSeal.mockResolvedValue('sealed');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('seals camelCase tokens and returns the decoded jwt with seconds until expiry', async () => {
    // Act
    const [session, decodedJwt, refreshToken] = await createSessionFromAccessToken({
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    // Assert
    expect(mockedVerify).toHaveBeenCalledWith('access');
    expect(mockedSeal).toHaveBeenCalledWith({ accessToken: 'access', refreshToken: 'refresh' }, EXP);
    expect(session).toBe('sealed');
    expect(decodedJwt).toEqual({ exp: EXP, sub: 'u', expiresIn: 3600 });
    expect(refreshToken).toBe('refresh');
  });

  it('accepts snake_case tokens from oauth responses', async () => {
    await createSessionFromAccessToken({ access_token: 'access', refresh_token: 'refresh' });

    expect(mockedSeal).toHaveBeenCalledWith({ accessToken: 'access', refreshToken: 'refresh' }, EXP);
  });

  it('rejects when the access token cannot be verified', async () => {
    mockedVerify.mockRejectedValue(new Error('bad signature'));

    await expect(createSessionFromAccessToken({ accessToken: 'x' })).rejects.toThrow('bad signature');
    expect(mockedSeal).not.toHaveBeenCalled();
  });
});

describe('getTokensFromCookie', () => {
  it('returns undefined without a cookie', async () => {
    await expect(getTokensFromCookie(undefined)).resolves.toBeUndefined();
    await expect(getTokensFromCookie('')).resolves.toBeUndefined();
    expect(mockedUnseal).not.toHaveBeenCalled();
  });

  it('unseals the tokens stored in the cookie', async () => {
    mockedUnseal.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });

    await expect(getTokensFromCookie('sealed')).resolves.toEqual({ accessToken: 'a', refreshToken: 'r' });
    expect(mockedUnseal).toHaveBeenCalledWith('sealed');
  });
});

describe('getAfterAuthRedirectUrl', () => {
  it('builds an absolute url for the redirect path on the current origin', () => {
    expect(getAfterAuthRedirectUrl({ redirectUrl: '/dashboard' })).toBe(`${window.location.origin}/dashboard`);
  });

  it('appends the remaining query params to the redirect path', () => {
    // Act
    const result = getAfterAuthRedirectUrl({ redirectUrl: '/dashboard', tab: '2', q: 'a b' });

    // Assert
    expect(result).toBe(`${window.location.origin}/dashboard?tab=2&q=a+b`);
  });

  it('skips undefined query values', () => {
    expect(getAfterAuthRedirectUrl({ redirectUrl: '/x', empty: undefined })).toBe(`${window.location.origin}/x`);
  });
});
