// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnvVariables } from '../../../src/config/constants';
import { clearFronteggEnv, loadConfig, restoreFronteggEnv, setEnv, VALID_PASSWORD } from './envHelpers';

/**
 * Server-side (no `window`) behaviour of the Config singleton: the constructor validates
 * FRONTEGG_ENCRYPTION_PASSWORD at import time unless FRONTEGG_SSG_EXPORT is enabled.
 */

const INVALID_PASSWORD_MESSAGE = `Invalid environment variable (${EnvVariables.FRONTEGG_ENCRYPTION_PASSWORD}), must be a valid Hex string.`;

beforeEach(() => {
  clearFronteggEnv();
});

afterEach(() => {
  restoreFronteggEnv();
});

describe('Config constructor on the server', () => {
  it('runs without a window object', () => {
    expect(typeof window).toBe('undefined');
  });

  it('loads successfully with a valid 64-char hex encryption password', async () => {
    // Arrange
    setEnv({ FRONTEGG_ENCRYPTION_PASSWORD: VALID_PASSWORD });

    // Act
    const config = await loadConfig();

    // Assert
    expect(config.password).toEqual({ 1: VALID_PASSWORD });
  });

  it('throws at import time when the encryption password is missing', async () => {
    await expect(loadConfig()).rejects.toThrow(INVALID_PASSWORD_MESSAGE);
  });

  it('throws at import time when the encryption password is too short', async () => {
    setEnv({ FRONTEGG_ENCRYPTION_PASSWORD: VALID_PASSWORD.slice(0, 32) });

    await expect(loadConfig()).rejects.toThrow(INVALID_PASSWORD_MESSAGE);
  });

  it('throws at import time when the encryption password is too long', async () => {
    setEnv({ FRONTEGG_ENCRYPTION_PASSWORD: `${VALID_PASSWORD}ab` });

    await expect(loadConfig()).rejects.toThrow(INVALID_PASSWORD_MESSAGE);
  });

  it('throws at import time when a 64-char password contains no hex sequence', async () => {
    setEnv({ FRONTEGG_ENCRYPTION_PASSWORD: 'z'.repeat(64) });

    await expect(loadConfig()).rejects.toThrow(INVALID_PASSWORD_MESSAGE);
  });

  it('skips password validation when FRONTEGG_SSG_EXPORT is "true"', async () => {
    // Arrange
    setEnv({ FRONTEGG_SSG_EXPORT: 'true' });

    // Act
    const config = await loadConfig();

    // Assert
    expect(config.isSSGExport).toBe(true);
    expect(() => config.password).toThrow(INVALID_PASSWORD_MESSAGE);
  });
});
