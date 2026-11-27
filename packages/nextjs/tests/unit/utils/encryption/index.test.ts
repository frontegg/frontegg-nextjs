// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EncryptionUtils, FronteggUserTokens } from '../../../../src/types';

const PASSWORD_A = 'a1'.repeat(32);
const PASSWORD_B = 'b2'.repeat(32);
const ONE_HOUR_SEC = 3600;
const TWO_HOURS_MS = 2 * 3600 * 1000;

const mockConfig = vi.hoisted(() => ({ password: {} as Record<string, string> }));

vi.mock('../../../../src/config', () => ({ default: mockConfig }));

import nodeEncryption from '../../../../src/utils/encryption';
import edgeEncryption from '../../../../src/utils/encryption-edge';

const TOKENS: FronteggUserTokens = { accessToken: 'access.jwt.token', refreshToken: 'refresh-token' };

/** unsealTokens currently throws on an invalid seal; callers treat either a throw or undefined as "no session". */
const unsealOrUndefined = (utils: EncryptionUtils, sealed: string) => utils.unsealTokens(sealed).catch(() => undefined);

beforeEach(() => {
  mockConfig.password = { 1: PASSWORD_A };
});

afterEach(() => {
  vi.useRealTimers();
});

describe.each([
  ['encryption (node)', nodeEncryption],
  ['encryption-edge', edgeEncryption],
])('%s', (_name, utils) => {
  it('round-trips tokens through sealTokens and unsealTokens', async () => {
    const sealed = await utils.sealTokens(TOKENS, ONE_HOUR_SEC);
    const unsealed = await utils.unsealTokens(sealed);

    expect(unsealed).toEqual(TOKENS);
  });

  it('produces an opaque seal that does not leak the raw tokens', async () => {
    const sealed = await utils.sealTokens(TOKENS, ONE_HOUR_SEC);

    expect(typeof sealed).toBe('string');
    expect(sealed).not.toContain(TOKENS.accessToken);
    expect(sealed).not.toContain(TOKENS.refreshToken);
  });

  it('produces a different seal on every call for the same tokens', async () => {
    const first = await utils.sealTokens(TOKENS, ONE_HOUR_SEC);
    const second = await utils.sealTokens(TOKENS, ONE_HOUR_SEC);

    expect(first).not.toBe(second);
  });

  it('preserves tokens without a refresh token', async () => {
    const tokens = { accessToken: 'only-access' };

    const unsealed = await utils.unsealTokens(await utils.sealTokens(tokens, ONE_HOUR_SEC));

    expect(unsealed).toEqual(tokens);
  });

  it('does not return tokens when unsealing with a different password', async () => {
    const sealed = await utils.sealTokens(TOKENS, ONE_HOUR_SEC);
    mockConfig.password = { 1: PASSWORD_B };

    const result = await unsealOrUndefined(utils, sealed);

    expect(result).toBeUndefined();
  });

  it('unseals a cookie sealed with a rotated-out password when it is still in the password map', async () => {
    const sealed = await utils.sealTokens(TOKENS, ONE_HOUR_SEC);
    mockConfig.password = { 2: PASSWORD_B, 1: PASSWORD_A };

    const result = await utils.unsealTokens(sealed);

    expect(result).toEqual(TOKENS);
  });

  it('does not return tokens when the seal has been tampered with', async () => {
    const sealed = await utils.sealTokens(TOKENS, ONE_HOUR_SEC);
    const tampered = sealed.slice(0, 40) + (sealed[40] === 'A' ? 'B' : 'A') + sealed.slice(41);

    const result = await unsealOrUndefined(utils, tampered);

    expect(result).toBeUndefined();
  });

  it('does not return tokens after the seal ttl has expired', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const sealed = await utils.sealTokens(TOKENS, ONE_HOUR_SEC);
    vi.setSystemTime(Date.now() + TWO_HOURS_MS);

    const result = await unsealOrUndefined(utils, sealed);

    expect(result).toBeUndefined();
  });
});

describe('cross-runtime compatibility', () => {
  it('unseals in the node runtime a cookie sealed in the edge runtime', async () => {
    const sealed = await edgeEncryption.sealTokens(TOKENS, ONE_HOUR_SEC);

    await expect(nodeEncryption.unsealTokens(sealed)).resolves.toEqual(TOKENS);
  });

  it('unseals in the edge runtime a cookie sealed in the node runtime', async () => {
    const sealed = await nodeEncryption.sealTokens(TOKENS, ONE_HOUR_SEC);

    await expect(edgeEncryption.unsealTokens(sealed)).resolves.toEqual(TOKENS);
  });
});
