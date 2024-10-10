import { AuthPageRoutes } from '@frontegg/redux-store';
import { WithFronteggAppOptions } from '../pages';
import { AppEnvConfig, PasswordsMap } from './types';
import { generateAppUrl, generateCookieDomain, getEnv, getEnvOrDefault, normalizeStringPasswordToMap } from './helpers';
import { EnvVariables } from './constants';
import { InvalidFronteggEnv } from '../utils/errors';

const setupEnvVariables = {
  FRONTEGG_APP_URL: process.env.FRONTEGG_APP_URL,
  FRONTEGG_BASE_URL: process.env.FRONTEGG_BASE_URL,
  FRONTEGG_TEST_URL: process.env.FRONTEGG_TEST_URL,
  FRONTEGG_CLIENT_ID: process.env.FRONTEGG_CLIENT_ID,
  FRONTEGG_CLIENT_SECRET: process.env.FRONTEGG_CLIENT_SECRET,
  FRONTEGG_ENCRYPTION_PASSWORD: process.env.FRONTEGG_ENCRYPTION_PASSWORD,
  FRONTEGG_COOKIE_NAME: process.env.FRONTEGG_COOKIE_NAME,
  FRONTEGG_COOKIE_DOMAIN: process.env.FRONTEGG_COOKIE_DOMAIN,
  FRONTEGG_JWT_PUBLIC_KEY: process.env.FRONTEGG_JWT_PUBLIC_KEY,
  FRONTEGG_SECURE_JWT_ENABLED: process.env.FRONTEGG_SECURE_JWT_ENABLED,
  DISABLE_INITIAL_PROPS_REFRESH_TOKEN: process.env.DISABLE_INITIAL_PROPS_REFRESH_TOKEN,
  VERCEL: process.env.VERCEL,
  VERCEL_URL: process.env.VERCEL_URL,
};

class Config {
  public fronteggAppOptions: Partial<WithFronteggAppOptions> = {};

  constructor() {
    if (typeof window === 'undefined') {
      this.validatePassword();
    }
  }

  get appUrl(): string {
    return generateAppUrl();
  }

  get testUrl(): string | undefined {
    return getEnvOrDefault(EnvVariables.FRONTEGG_TEST_URL, setupEnvVariables.FRONTEGG_TEST_URL);
  }

  get baseUrl(): string {
    const baseUrl = getEnv(EnvVariables.FRONTEGG_BASE_URL) ?? setupEnvVariables.FRONTEGG_BASE_URL;
    if (baseUrl.endsWith('/')) {
      return baseUrl.slice(0, -1);
    }
    return baseUrl;
  }

  get baseUrlHost(): string {
    return new URL(this.baseUrl).hostname;
  }

  get clientId(): string {
    return getEnv(EnvVariables.FRONTEGG_CLIENT_ID) ?? setupEnvVariables.FRONTEGG_CLIENT_ID;
  }

  get clientSecret(): string | undefined {
    let clientSecret = undefined;
    try {
      clientSecret = getEnv(EnvVariables.FRONTEGG_CLIENT_SECRET) ?? setupEnvVariables.FRONTEGG_CLIENT_SECRET;
    } catch (e) {
      clientSecret = setupEnvVariables.FRONTEGG_CLIENT_SECRET;
    }

    if (this.secureJwtEnabled === 'true' && !clientSecret) {
      throw new InvalidFronteggEnv(
        EnvVariables.FRONTEGG_CLIENT_SECRET,
        'Client secret is required when secure JWT is enabled'
      );
    }
    return clientSecret;
  }

  get jwtPublicKeyJson(): string | undefined {
    return getEnv(EnvVariables.FRONTEGG_JWT_PUBLIC_KEY);
  }

  get secureJwtEnabled(): string | undefined {
    try {
      return getEnv(EnvVariables.FRONTEGG_SECURE_JWT_ENABLED) ?? setupEnvVariables.FRONTEGG_SECURE_JWT_ENABLED;
    } catch (e) {
      return setupEnvVariables.FRONTEGG_SECURE_JWT_ENABLED;
    }
  }

  get cookieName(): string {
    const cookieNameEnv = getEnvOrDefault(
      EnvVariables.FRONTEGG_COOKIE_NAME,
      setupEnvVariables.FRONTEGG_COOKIE_NAME ?? 'fe_session'
    );
    return `${cookieNameEnv}-${this.clientId.replace(/-/g, '')}`;
  }

  get cookieDomain(): string {
    return getEnvOrDefault(
      EnvVariables.FRONTEGG_COOKIE_DOMAIN,
      setupEnvVariables.FRONTEGG_COOKIE_DOMAIN ?? generateCookieDomain(this.appUrl)
    );
  }

  get authRoutes(): Partial<AuthPageRoutes> {
    return this.fronteggAppOptions?.authOptions?.routes ?? {};
  }

  private validatePassword() {
    const passwordMaps = this.password;
    for (let key of Object.keys(passwordMaps)) {
      const password = passwordMaps[key];
      if (!password.match(/[0-9A-Fa-f]{6}/g) || password.length !== 64) {
        throw new InvalidFronteggEnv(
          EnvVariables.FRONTEGG_ENCRYPTION_PASSWORD,
          `Hex string.\n\nFor quick password generation use the following command:\nnode -e "console.log(crypto.randomBytes(32).toString('hex'))"`
        );
      }
    }
  }

  get password(): PasswordsMap {
    const encryptionPasswordEnv =
      getEnv(EnvVariables.FRONTEGG_ENCRYPTION_PASSWORD) ?? setupEnvVariables.FRONTEGG_ENCRYPTION_PASSWORD;

    return normalizeStringPasswordToMap(encryptionPasswordEnv);
  }

  get isSSL(): boolean {
    return new URL(this.appUrl).protocol === 'https:';
  }

  get isHostedLogin(): boolean {
    return (
      this.fronteggAppOptions.hostedLoginBox ?? getEnvOrDefault(EnvVariables.FRONTEGG_HOSTED_LOGIN, 'false') === 'true'
    );
  }

  get isForwardIpEnabled(): boolean {
    if (this.clientSecret) {
      return getEnvOrDefault(EnvVariables.FRONTEGG_HOSTED_LOGIN, 'false') === 'true';
    }
    return false;
  }

  get disableInitialPropsRefreshToken(): boolean {
    const disableInitialPropsRefreshToken = getEnvOrDefault(
      EnvVariables.DISABLE_INITIAL_PROPS_REFRESH_TOKEN,
      setupEnvVariables.DISABLE_INITIAL_PROPS_REFRESH_TOKEN
    );
    return disableInitialPropsRefreshToken === 'true';
  }

  get appEnvConfig(): AppEnvConfig {
    const config = {
      envAppUrl: this.appUrl,
      envBaseUrl: this.baseUrl,
      envClientId: this.clientId,
      secureJwtEnabled: this.secureJwtEnabled,
    };
    console.log('this.appEnvConfig', config);
    return config;
  }
}

export { EnvVariables } from './constants';
export default new Config();
