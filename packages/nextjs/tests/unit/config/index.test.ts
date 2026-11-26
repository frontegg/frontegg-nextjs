import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnvVariables } from '../../../src/config/constants';
import { clearFronteggEnv, loadConfig, restoreFronteggEnv, setEnv, unsetEnv, VALID_PASSWORD } from './envHelpers';

/** jsdom defines `window`, so password validation is skipped here; see index.server.test.ts. */

const BASE_ENV = {
  FRONTEGG_APP_URL: 'https://app.example.com',
  FRONTEGG_BASE_URL: 'https://tenant.frontegg.com',
  FRONTEGG_CLIENT_ID: 'abc-def-123',
  FRONTEGG_ENCRYPTION_PASSWORD: VALID_PASSWORD,
};

beforeEach(() => {
  clearFronteggEnv();
  global.customLoginAppUrl = undefined;
});

afterEach(() => {
  restoreFronteggEnv();
  global.customLoginAppUrl = undefined;
});

describe('config module', () => {
  it('re-exports EnvVariables from constants', async () => {
    vi.resetModules();
    const mod = await import('../../../src/config');

    expect(mod.EnvVariables).toStrictEqual(EnvVariables);
    expect(mod.EnvVariables.FRONTEGG_APP_URL).toBe('FRONTEGG_APP_URL');
  });

  it('does not validate the encryption password in the browser (window defined)', async () => {
    // missing password would throw on the server
    setEnv({ FRONTEGG_APP_URL: BASE_ENV.FRONTEGG_APP_URL });

    const config = await loadConfig();

    // construction succeeded even though the password getter itself is invalid
    expect(config.appUrl).toBe(BASE_ENV.FRONTEGG_APP_URL);
    expect(() => config.password).toThrow(
      `Invalid environment variable (${EnvVariables.FRONTEGG_ENCRYPTION_PASSWORD}), must be a valid Hex string.`
    );
  });
});

describe('Config.isSSGExport', () => {
  it('is true when FRONTEGG_SSG_EXPORT is "true"', async () => {
    setEnv({ FRONTEGG_SSG_EXPORT: 'true' });
    const config = await loadConfig();

    expect(config.isSSGExport).toBe(true);
  });

  it('is false when FRONTEGG_SSG_EXPORT is unset', async () => {
    const config = await loadConfig();

    expect(config.isSSGExport).toBe(false);
  });

  it('is false for any value other than "true"', async () => {
    setEnv({ FRONTEGG_SSG_EXPORT: '1' });
    const config = await loadConfig();

    expect(config.isSSGExport).toBe(false);
  });

  it('falls back to the value captured at module load when the env is later removed', async () => {
    setEnv({ FRONTEGG_SSG_EXPORT: 'true' });
    const config = await loadConfig();
    unsetEnv(EnvVariables.FRONTEGG_SSG_EXPORT);

    // + Assert
    expect(config.isSSGExport).toBe(true);
  });
});

describe('Config.appUrl / isSSL', () => {
  it('returns the generated app url', async () => {
    setEnv(BASE_ENV);
    const config = await loadConfig();

    expect(config.appUrl).toBe('https://app.example.com');
  });

  it('isSSL is true for an https app url', async () => {
    setEnv(BASE_ENV);
    const config = await loadConfig();

    expect(config.isSSL).toBe(true);
  });

  it('isSSL is false for an http app url', async () => {
    setEnv({ ...BASE_ENV, FRONTEGG_APP_URL: 'localhost:3000' });
    const config = await loadConfig();

    expect(config.isSSL).toBe(false);
  });
});

describe('Config.testUrl / appId', () => {
  it('returns FRONTEGG_TEST_URL and FRONTEGG_APP_ID when set', async () => {
    setEnv({ FRONTEGG_TEST_URL: 'https://test.example.com', FRONTEGG_APP_ID: 'app-id-1' });
    const config = await loadConfig();

    expect(config.testUrl).toBe('https://test.example.com');
    expect(config.appId).toBe('app-id-1');
  });

  it('returns undefined when FRONTEGG_TEST_URL and FRONTEGG_APP_ID are unset', async () => {
    const config = await loadConfig();

    expect(config.testUrl).toBeUndefined();
    expect(config.appId).toBeUndefined();
  });
});

describe('Config.baseUrl / baseUrlHost', () => {
  it('returns FRONTEGG_BASE_URL unchanged when it has no trailing slash', async () => {
    setEnv(BASE_ENV);
    const config = await loadConfig();

    expect(config.baseUrl).toBe('https://tenant.frontegg.com');
  });

  it('strips a single trailing slash from FRONTEGG_BASE_URL', async () => {
    setEnv({ FRONTEGG_BASE_URL: 'https://tenant.frontegg.com/' });
    const config = await loadConfig();

    expect(config.baseUrl).toBe('https://tenant.frontegg.com');
  });

  it('throws FronteggEnvNotFound when FRONTEGG_BASE_URL is missing', async () => {
    const config = await loadConfig();

    expect(() => config.baseUrl).toThrow(`(${EnvVariables.FRONTEGG_BASE_URL})`);
  });

  it('falls back to the value captured at module load when the env is later removed', async () => {
    setEnv(BASE_ENV);
    const config = await loadConfig();
    unsetEnv(EnvVariables.FRONTEGG_BASE_URL);

    expect(config.baseUrl).toBe('https://tenant.frontegg.com');
  });

  it('baseUrlHost returns only the hostname of the base url', async () => {
    setEnv({ FRONTEGG_BASE_URL: 'https://tenant.frontegg.com:8443/' });
    const config = await loadConfig();

    expect(config.baseUrlHost).toBe('tenant.frontegg.com');
  });
});

describe('Config.clientId', () => {
  it('returns FRONTEGG_CLIENT_ID', async () => {
    setEnv(BASE_ENV);
    const config = await loadConfig();

    expect(config.clientId).toBe('abc-def-123');
  });

  it('throws FronteggEnvNotFound when FRONTEGG_CLIENT_ID is missing', async () => {
    const config = await loadConfig();

    expect(() => config.clientId).toThrow(`(${EnvVariables.FRONTEGG_CLIENT_ID})`);
  });

  /** Known bug (src/config/index.ts:74): `??` applies to the env name, so clientId never uses the load-time value. */
  it.fails('falls back to the value captured at module load when the env is later removed', async () => {
    setEnv(BASE_ENV);
    const config = await loadConfig();
    unsetEnv(EnvVariables.FRONTEGG_CLIENT_ID);

    expect(config.clientId).toBe('abc-def-123');
  });
});

describe('Config.rewriteCookieByAppId / shouldForwardIp / secureJwtEnabled / hostedLoginCallbackOnAppUrl', () => {
  it('are all true when their env variables are "true"', async () => {
    setEnv({
      FRONTEGG_REWRITE_COOKIE_BY_APP_ID: 'true',
      FRONTEGG_FORWARD_IP: 'true',
      FRONTEGG_SECURE_JWT_ENABLED: 'true',
      FRONTEGG_HOSTED_LOGIN_CALLBACK_ON_APP_URL: 'true',
    });
    const config = await loadConfig();

    expect(config.rewriteCookieByAppId).toBe(true);
    expect(config.shouldForwardIp).toBe(true);
    expect(config.secureJwtEnabled).toBe(true);
    expect(config.hostedLoginCallbackOnAppUrl).toBe(true);
  });

  it('all default to false when their env variables are unset', async () => {
    const config = await loadConfig();

    expect(config.rewriteCookieByAppId).toBe(false);
    expect(config.shouldForwardIp).toBe(false);
    expect(config.secureJwtEnabled).toBe(false);
    expect(config.hostedLoginCallbackOnAppUrl).toBe(false);
  });

  it('are false for truthy-looking values other than "true"', async () => {
    setEnv({
      FRONTEGG_REWRITE_COOKIE_BY_APP_ID: '1',
      FRONTEGG_FORWARD_IP: 'yes',
      FRONTEGG_SECURE_JWT_ENABLED: 'TRUE',
      FRONTEGG_HOSTED_LOGIN_CALLBACK_ON_APP_URL: 'on',
    });
    const config = await loadConfig();

    expect(config.rewriteCookieByAppId).toBe(false);
    expect(config.shouldForwardIp).toBe(false);
    expect(config.secureJwtEnabled).toBe(false);
    expect(config.hostedLoginCallbackOnAppUrl).toBe(false);
  });
});

describe('Config.clientSecret', () => {
  it('returns FRONTEGG_CLIENT_SECRET when set', async () => {
    setEnv({ FRONTEGG_CLIENT_SECRET: 'client-secret' });
    const config = await loadConfig();

    expect(config.clientSecret).toBe('client-secret');
  });

  it('returns undefined when unset and secure JWT is disabled', async () => {
    const config = await loadConfig();

    expect(config.clientSecret).toBeUndefined();
  });

  it('falls back to the value captured at module load when the env is later removed', async () => {
    setEnv({ FRONTEGG_CLIENT_SECRET: 'client-secret' });
    const config = await loadConfig();
    unsetEnv(EnvVariables.FRONTEGG_CLIENT_SECRET);

    expect(config.clientSecret).toBe('client-secret');
  });

  it('throws InvalidFronteggEnv when secure JWT is enabled but no client secret is configured', async () => {
    setEnv({ FRONTEGG_SECURE_JWT_ENABLED: 'true' });
    const config = await loadConfig();

    expect(() => config.clientSecret).toThrow(
      `Invalid environment variable (${EnvVariables.FRONTEGG_CLIENT_SECRET}), must be a valid Client secret is required when secure JWT is enabled`
    );
  });

  it('returns the client secret when secure JWT is enabled and a secret is configured', async () => {
    setEnv({ FRONTEGG_SECURE_JWT_ENABLED: 'true', FRONTEGG_CLIENT_SECRET: 'client-secret' });
    const config = await loadConfig();

    expect(config.clientSecret).toBe('client-secret');
  });
});

describe('Config.sharedSecret', () => {
  it('returns FRONTEGG_SHARED_SECRET when set', async () => {
    setEnv({ FRONTEGG_SHARED_SECRET: 'shared-secret' });
    const config = await loadConfig();

    expect(config.sharedSecret).toBe('shared-secret');
  });

  it('returns undefined when unset', async () => {
    const config = await loadConfig();

    expect(config.sharedSecret).toBeUndefined();
  });

  it('falls back to the value captured at module load when the env is later removed', async () => {
    setEnv({ FRONTEGG_SHARED_SECRET: 'shared-secret' });
    const config = await loadConfig();
    unsetEnv(EnvVariables.FRONTEGG_SHARED_SECRET);

    expect(config.sharedSecret).toBe('shared-secret');
  });
});

describe('Config.jwtPublicKeyJson', () => {
  it('returns FRONTEGG_JWT_PUBLIC_KEY when set', async () => {
    setEnv({ FRONTEGG_JWT_PUBLIC_KEY: '{"kty":"RSA"}' });
    const config = await loadConfig();

    expect(config.jwtPublicKeyJson).toBe('{"kty":"RSA"}');
  });

  /** JwtManager relies on this throw to fall back to the JWKS download; change both together. */
  it('throws FronteggEnvNotFound when FRONTEGG_JWT_PUBLIC_KEY is not set', async () => {
    setEnv(BASE_ENV);
    const config = await loadConfig();

    expect(() => config.jwtPublicKeyJson).toThrow(
      `Missing one or more environment variables (${EnvVariables.FRONTEGG_JWT_PUBLIC_KEY})`
    );
  });
});

describe('Config.cookieName', () => {
  it('defaults to "fe_session-<clientId without dashes>"', async () => {
    setEnv(BASE_ENV);
    const config = await loadConfig();

    expect(config.cookieName).toBe('fe_session-abcdef123');
  });

  it('uses FRONTEGG_COOKIE_NAME as the prefix when set', async () => {
    setEnv({ ...BASE_ENV, FRONTEGG_COOKIE_NAME: 'my_cookie' });
    const config = await loadConfig();

    expect(config.cookieName).toBe('my_cookie-abcdef123');
  });

  it('uses the appId (without dashes) when rewriteCookieByAppId is enabled and appId is set', async () => {
    setEnv({ ...BASE_ENV, FRONTEGG_REWRITE_COOKIE_BY_APP_ID: 'true', FRONTEGG_APP_ID: 'app-id-9' });
    const config = await loadConfig();

    expect(config.cookieName).toBe('fe_session-appid9');
  });

  it('falls back to the clientId when rewriteCookieByAppId is enabled but appId is missing', async () => {
    setEnv({ ...BASE_ENV, FRONTEGG_REWRITE_COOKIE_BY_APP_ID: 'true' });
    const config = await loadConfig();

    expect(config.cookieName).toBe('fe_session-abcdef123');
  });

  it('ignores the appId when rewriteCookieByAppId is disabled', async () => {
    setEnv({ ...BASE_ENV, FRONTEGG_APP_ID: 'app-id-9' });
    const config = await loadConfig();

    expect(config.cookieName).toBe('fe_session-abcdef123');
  });
});

describe('Config.cookieDomain', () => {
  it('returns FRONTEGG_COOKIE_DOMAIN when set', async () => {
    setEnv({ ...BASE_ENV, FRONTEGG_COOKIE_DOMAIN: '.example.com' });
    const config = await loadConfig();

    expect(config.cookieDomain).toBe('.example.com');
  });

  it('derives the domain from the app url when FRONTEGG_COOKIE_DOMAIN is unset', async () => {
    setEnv({ ...BASE_ENV, FRONTEGG_APP_URL: 'http://localhost:3000' });
    const config = await loadConfig();

    expect(config.cookieDomain).toBe('localhost');
  });
});

describe('Config.cookieSameSite', () => {
  it.each([
    ['true', 'strict'],
    ['false', 'none'],
    ['lax', 'lax'],
    ['strict', 'strict'],
    ['none', 'none'],
    ['LAX', 'none'],
    ['garbage', 'none'],
  ])('maps FRONTEGG_COOKIE_SAME_SITE=%s to %s', async (envValue, expected) => {
    setEnv({ FRONTEGG_COOKIE_SAME_SITE: envValue });
    const config = await loadConfig();

    expect(config.cookieSameSite).toBe(expected);
  });

  it('defaults to none when FRONTEGG_COOKIE_SAME_SITE is unset', async () => {
    const config = await loadConfig();

    expect(config.cookieSameSite).toBe('none');
  });
});

describe('Config.authRoutes', () => {
  it('returns an empty object when no app options are set', async () => {
    const config = await loadConfig();

    expect(config.authRoutes).toEqual({});
  });

  it('returns routes from fronteggAppOptions.authOptions.routes', async () => {
    const config = await loadConfig();
    config.fronteggAppOptions = { authOptions: { routes: { loginUrl: '/custom-login' } } };

    // + Assert
    expect(config.authRoutes).toEqual({ loginUrl: '/custom-login' });
  });

  it('returns an empty object when fronteggAppOptions is nullish', async () => {
    const config = await loadConfig();
    config.fronteggAppOptions = undefined as any;

    expect(config.authRoutes).toEqual({});
  });
});

describe('Config.password', () => {
  it('returns a password map keyed by "1" for a string password', async () => {
    setEnv({ FRONTEGG_ENCRYPTION_PASSWORD: VALID_PASSWORD });
    const config = await loadConfig();

    expect(config.password).toEqual({ 1: VALID_PASSWORD });
  });

  it('throws InvalidFronteggEnv when FRONTEGG_ENCRYPTION_PASSWORD is missing', async () => {
    const config = await loadConfig();

    expect(() => config.password).toThrow(
      `Invalid environment variable (${EnvVariables.FRONTEGG_ENCRYPTION_PASSWORD}), must be a valid Hex string.`
    );
  });
});

describe('Config.isHostedLogin', () => {
  it('is true when FRONTEGG_HOSTED_LOGIN is "true"', async () => {
    setEnv({ FRONTEGG_HOSTED_LOGIN: 'true' });
    const config = await loadConfig();

    expect(config.isHostedLogin).toBe(true);
  });

  it('is false when FRONTEGG_HOSTED_LOGIN is unset', async () => {
    const config = await loadConfig();

    expect(config.isHostedLogin).toBe(false);
  });

  it('prefers fronteggAppOptions.hostedLoginBox over the env variable', async () => {
    setEnv({ FRONTEGG_HOSTED_LOGIN: 'true' });
    const config = await loadConfig();
    config.fronteggAppOptions = { hostedLoginBox: false };

    expect(config.isHostedLogin).toBe(false);
  });
});

describe('Config.isVercel', () => {
  it('is true when VERCEL is "1"', async () => {
    setEnv({ VERCEL: '1' });
    const config = await loadConfig();

    expect(config.isVercel).toBe(true);
  });

  it('is false when VERCEL is unset', async () => {
    const config = await loadConfig();

    expect(config.isVercel).toBe(false);
  });
});

describe('Config.disableInitialPropsRefreshToken', () => {
  it('is true when DISABLE_INITIAL_PROPS_REFRESH_TOKEN is "true"', async () => {
    setEnv({ DISABLE_INITIAL_PROPS_REFRESH_TOKEN: 'true' });
    const config = await loadConfig();

    expect(config.disableInitialPropsRefreshToken).toBe(true);
  });

  it('is false when DISABLE_INITIAL_PROPS_REFRESH_TOKEN is unset', async () => {
    const config = await loadConfig();

    expect(config.disableInitialPropsRefreshToken).toBe(false);
  });
});

describe('Config.ipResolver', () => {
  it('is undefined by default and returns the resolver once set', async () => {
    const config = await loadConfig();
    const resolver = vi.fn(() => '1.2.3.4');

    const before = config.ipResolver;
    config.ipResolver = resolver;

    expect(before).toBeUndefined();
    expect(config.ipResolver).toBe(resolver);
  });

  it('can be cleared by setting undefined', async () => {
    const config = await loadConfig();
    config.ipResolver = () => '1.2.3.4';

    config.ipResolver = undefined;

    expect(config.ipResolver).toBeUndefined();
  });
});

describe('Config.appEnvConfig', () => {
  it('collects the client-side env config from the individual getters', async () => {
    setEnv({
      ...BASE_ENV,
      FRONTEGG_APP_ID: 'app-id-1',
      FRONTEGG_SECURE_JWT_ENABLED: 'true',
      FRONTEGG_HOSTED_LOGIN: 'true',
    });
    const config = await loadConfig();

    const appEnvConfig = config.appEnvConfig;

    expect(appEnvConfig).toEqual({
      envAppUrl: 'https://app.example.com',
      envBaseUrl: 'https://tenant.frontegg.com',
      envClientId: 'abc-def-123',
      envAppId: 'app-id-1',
      secureJwtEnabled: true,
      envHostedLoginBox: true,
    });
  });

  it('does not expose secrets', async () => {
    setEnv({ ...BASE_ENV, FRONTEGG_CLIENT_SECRET: 'client-secret', FRONTEGG_SHARED_SECRET: 'shared' });
    const config = await loadConfig();

    const serialized = JSON.stringify(config.appEnvConfig);

    expect(serialized).not.toContain('client-secret');
    expect(serialized).not.toContain('shared');
    expect(serialized).not.toContain(VALID_PASSWORD);
  });
});

describe('Config.checkHostedLoginConfig', () => {
  it('does nothing when options are undefined', async () => {
    const config = await loadConfig();

    expect(() => config.checkHostedLoginConfig(undefined)).not.toThrow();
  });

  it('does nothing when options.hostedLoginBox is undefined', async () => {
    setEnv({ FRONTEGG_HOSTED_LOGIN: 'true' });
    const config = await loadConfig();

    expect(() => config.checkHostedLoginConfig({} as any)).not.toThrow();
  });

  it('does not throw when options.hostedLoginBox matches FRONTEGG_HOSTED_LOGIN', async () => {
    setEnv({ FRONTEGG_HOSTED_LOGIN: 'true' });
    const config = await loadConfig();

    expect(() => config.checkHostedLoginConfig({ hostedLoginBox: true } as any)).not.toThrow();
  });

  it('throws a mismatch error when options.hostedLoginBox differs from FRONTEGG_HOSTED_LOGIN', async () => {
    setEnv({ FRONTEGG_HOSTED_LOGIN: 'true' });
    const config = await loadConfig();

    expect(() => config.checkHostedLoginConfig({ hostedLoginBox: false } as any)).toThrow(
      /mismatch between FRONTEGG_HOSTED_LOGIN environment variable and withFronteggOptions/
    );
  });
});
