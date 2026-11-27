import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateAppUrl,
  generateCookieDomain,
  getEnv,
  getEnvOrDefault,
  normalizeStringPasswordToMap,
} from '../../../src/config/helpers';
import { EnvVariables } from '../../../src/config/constants';
import { FronteggEnvNotFound, InvalidFronteggEnv } from '../../../src/utils/errors';
import { clearFronteggEnv, restoreFronteggEnv, setEnv } from './envHelpers';

const CUSTOM_ENV_NAME = 'FRONTEGG_UNIT_TEST_CUSTOM_ENV';

beforeEach(() => {
  clearFronteggEnv();
  delete process.env[CUSTOM_ENV_NAME];
  global.customLoginAppUrl = undefined;
});

afterEach(() => {
  restoreFronteggEnv();
  delete process.env[CUSTOM_ENV_NAME];
  global.customLoginAppUrl = undefined;
});

describe('getEnv', () => {
  it('returns the value of a defined environment variable', () => {
    setEnv({ [CUSTOM_ENV_NAME]: 'some-value' });

    const value = getEnv(CUSTOM_ENV_NAME);

    expect(value).toBe('some-value');
  });

  it('throws FronteggEnvNotFound naming the variable when it is missing', () => {
    const act = () => getEnv(CUSTOM_ENV_NAME);

    expect(act).toThrow(FronteggEnvNotFound);
    expect(act).toThrow(`Missing one or more environment variables (${CUSTOM_ENV_NAME})`);
  });

  it('treats an empty string as a missing variable', () => {
    setEnv({ [CUSTOM_ENV_NAME]: '' });

    // + Assert
    expect(() => getEnv(CUSTOM_ENV_NAME)).toThrow(FronteggEnvNotFound);
  });
});

describe('getEnvOrDefault', () => {
  it('returns the env value when it is defined', () => {
    setEnv({ [CUSTOM_ENV_NAME]: 'from-env' });

    expect(getEnvOrDefault(CUSTOM_ENV_NAME, 'fallback')).toBe('from-env');
  });

  it('returns the default value when the env variable is missing', () => {
    expect(getEnvOrDefault(CUSTOM_ENV_NAME, 'fallback')).toBe('fallback');
  });

  it('returns an undefined default without throwing', () => {
    expect(getEnvOrDefault(CUSTOM_ENV_NAME, undefined)).toBeUndefined();
  });
});

describe('generateCookieDomain', () => {
  it('extracts the hostname from a full https URL', () => {
    expect(generateCookieDomain('https://app.example.com/some/path?q=1')).toBe('app.example.com');
  });

  it('drops the port from the hostname', () => {
    expect(generateCookieDomain('http://localhost:3000')).toBe('localhost');
  });

  it('throws InvalidFronteggEnv for FRONTEGG_APP_URL when the URL cannot be parsed', () => {
    const act = () => generateCookieDomain('not a url');

    expect(act).toThrow(InvalidFronteggEnv);
    expect(act).toThrow(`Invalid environment variable (${EnvVariables.FRONTEGG_APP_URL}), must be a valid Valid URL`);
  });
});

describe('normalizeStringPasswordToMap', () => {
  it('wraps a string password into a map keyed by "1"', () => {
    expect(normalizeStringPasswordToMap('secret')).toEqual({ 1: 'secret' });
  });

  it('returns an existing password map as-is', () => {
    const passwords = { 1: 'first', 2: 'second' };

    const result = normalizeStringPasswordToMap(passwords);

    expect(result).toBe(passwords);
  });
});

describe('generateAppUrl', () => {
  it('returns FRONTEGG_APP_URL when it already contains a protocol', () => {
    setEnv({ FRONTEGG_APP_URL: 'https://my-app.example.com' });

    expect(generateAppUrl()).toBe('https://my-app.example.com');
  });

  it('prefers FRONTEGG_APP_URL over VERCEL_URL when both are present', () => {
    setEnv({ FRONTEGG_APP_URL: 'https://explicit.example.com', VERCEL: '1', VERCEL_URL: 'vercel.example.com' });

    expect(generateAppUrl()).toBe('https://explicit.example.com');
  });

  it('uses VERCEL_URL with an https protocol when running on Vercel without FRONTEGG_APP_URL', () => {
    setEnv({ VERCEL: '1', VERCEL_URL: 'my-app-123.vercel.app' });

    expect(generateAppUrl()).toBe('https://my-app-123.vercel.app');
  });

  it('ignores VERCEL_URL when the VERCEL flag is not set', () => {
    setEnv({ VERCEL_URL: 'my-app-123.vercel.app' });

    // + Assert
    expect(() => generateAppUrl()).toThrow(`(${EnvVariables.FRONTEGG_APP_URL})`);
  });

  it('prefixes http:// for a localhost app url without protocol', () => {
    setEnv({ FRONTEGG_APP_URL: 'localhost:3000' });

    expect(generateAppUrl()).toBe('http://localhost:3000');
  });

  it('prefixes https:// for a non-localhost app url without protocol', () => {
    setEnv({ FRONTEGG_APP_URL: 'app.example.com' });

    expect(generateAppUrl()).toBe('https://app.example.com');
  });

  it('throws naming VERCEL and VERCEL_URL when on Vercel but VERCEL_URL is missing', () => {
    setEnv({ VERCEL: '1' });

    const act = () => generateAppUrl();

    expect(act).toThrow(FronteggEnvNotFound);
    expect(act).toThrow(`(${EnvVariables.VERCEL}, ${EnvVariables.VERCEL_URL})`);
  });

  it('throws naming FRONTEGG_APP_URL when not on Vercel and no app url is set', () => {
    const act = () => generateAppUrl();

    expect(act).toThrow(FronteggEnvNotFound);
    expect(act).toThrow(`(${EnvVariables.FRONTEGG_APP_URL})`);
  });

  it('overrides the env app url with global.customLoginAppUrl when set', () => {
    setEnv({ FRONTEGG_APP_URL: 'https://vendor.example.com' });
    global.customLoginAppUrl = 'https://tenant.example.com';

    // + Assert
    expect(generateAppUrl()).toBe('https://tenant.example.com');
  });

  it('still requires an env app url even when global.customLoginAppUrl is set', () => {
    global.customLoginAppUrl = 'https://tenant.example.com';

    expect(() => generateAppUrl()).toThrow(FronteggEnvNotFound);
  });

  it('adds a protocol to a protocol-less global.customLoginAppUrl', () => {
    setEnv({ FRONTEGG_APP_URL: 'https://vendor.example.com' });
    global.customLoginAppUrl = 'tenant.example.com';

    expect(generateAppUrl()).toBe('https://tenant.example.com');
  });
});
