import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EncryptionUtils } from '../../../../src/types';

const mockJwt = vi.hoisted(() => ({ verify: vi.fn() }));

vi.mock('../../../../src/utils/jwt', () => ({ default: mockJwt }));

import createSession from '../../../../src/utils/createSession';

const NOW_MS = new Date('2026-06-01T12:00:00Z').getTime();
const NOW_SEC = Math.floor(NOW_MS / 1000);

const makeEncryption = (unseal: EncryptionUtils['unsealTokens']): EncryptionUtils => ({
  unsealTokens: vi.fn(unseal),
  sealTokens: vi.fn(),
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW_MS);
  mockJwt.verify.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createSession', () => {
  it('returns undefined without decrypting when the cookie is missing', async () => {
    const encryption = makeEncryption(async () => ({ accessToken: 'a' }));

    const result = await createSession(undefined, encryption);

    expect(result).toBeUndefined();
    expect(encryption.unsealTokens).not.toHaveBeenCalled();
  });

  it('returns undefined when the cookie is an empty string', async () => {
    const encryption = makeEncryption(async () => ({ accessToken: 'a' }));

    await expect(createSession('', encryption)).resolves.toBeUndefined();
    expect(encryption.unsealTokens).not.toHaveBeenCalled();
  });

  it('returns undefined when the sealed cookie has no tokens', async () => {
    const encryption = makeEncryption(async () => undefined);

    const result = await createSession('sealed', encryption);

    expect(result).toBeUndefined();
    expect(mockJwt.verify).not.toHaveBeenCalled();
  });

  it('returns undefined when the sealed cookie has no access token', async () => {
    const encryption = makeEncryption(async () => ({ refreshToken: 'r' }) as any);

    const result = await createSession('sealed', encryption);

    expect(result).toBeUndefined();
    expect(mockJwt.verify).not.toHaveBeenCalled();
  });

  it('builds a session from the unsealed tokens and the verified jwt payload', async () => {
    const payload = { sub: 'user-1', email: 'u@example.com', exp: NOW_SEC + 600 };
    mockJwt.verify.mockResolvedValue({ payload, protectedHeader: { alg: 'RS256' } });
    const encryption = makeEncryption(async () => ({ accessToken: 'access', refreshToken: 'refresh' }));

    const result = await createSession('sealed-cookie', encryption);

    expect(encryption.unsealTokens).toHaveBeenCalledWith('sealed-cookie');
    expect(mockJwt.verify).toHaveBeenCalledWith('access');
    expect(result).toEqual({ accessToken: 'access', refreshToken: 'refresh', user: payload });
  });

  it('returns a session without refresh token when only an access token is sealed', async () => {
    mockJwt.verify.mockResolvedValue({ payload: { sub: 'u', exp: NOW_SEC + 60 } });
    const encryption = makeEncryption(async () => ({ accessToken: 'access' }));

    const result = await createSession('sealed', encryption);

    expect(result).toEqual({ accessToken: 'access', refreshToken: undefined, user: { sub: 'u', exp: NOW_SEC + 60 } });
  });

  it('returns undefined when the verified token is already expired', async () => {
    mockJwt.verify.mockResolvedValue({ payload: { sub: 'u', exp: NOW_SEC - 1 } });
    const encryption = makeEncryption(async () => ({ accessToken: 'access' }));

    const result = await createSession('sealed', encryption);

    expect(result).toBeUndefined();
  });

  it('returns the session when the token expires exactly now', async () => {
    mockJwt.verify.mockResolvedValue({ payload: { sub: 'u', exp: NOW_MS / 1000 } });
    const encryption = makeEncryption(async () => ({ accessToken: 'access' }));

    const result = await createSession('sealed', encryption);

    expect(result?.accessToken).toBe('access');
  });

  it('returns undefined when jwt verification fails', async () => {
    mockJwt.verify.mockRejectedValue(new Error('signature verification failed'));
    const encryption = makeEncryption(async () => ({ accessToken: 'access' }));

    await expect(createSession('sealed', encryption)).resolves.toBeUndefined();
  });

  it('returns undefined when decrypting the cookie throws', async () => {
    const encryption = makeEncryption(async () => {
      throw new SyntaxError('bad seal');
    });

    await expect(createSession('sealed', encryption)).resolves.toBeUndefined();
    expect(mockJwt.verify).not.toHaveBeenCalled();
  });
});
