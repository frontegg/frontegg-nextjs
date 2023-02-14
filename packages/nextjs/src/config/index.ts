import { AuthPageRoutes } from '@frontegg/redux-store';
import { FronteggAppOptions } from '@frontegg/types';
import { AppEnvConfig, PasswordsMap } from './types';
import { generateAppUrl, generateCookieDomain, getEnv, getEnvOrDefault, normalizeStringPasswordToMap } from './helpers';
import { EnvVariables } from './constants';

const setupEnvVariables = {
  FRONTEGG_APP_URL: process.env.FRONTEGG_APP_URL,
  FRONTEGG_BASE_URL: process.env.FRONTEGG_BASE_URL,
  FRONTEGG_TEST_URL: process.env.FRONTEGG_TEST_URL,
  FRONTEGG_CLIENT_ID: process.env.FRONTEGG_CLIENT_ID,
  FRONTEGG_ENCRYPTION_PASSWORD: process.env.FRONTEGG_ENCRYPTION_PASSWORD,
  FRONTEGG_COOKIE_NAME: process.env.FRONTEGG_COOKIE_NAME,
  VERCEL: process.env.VERCEL,
  VERCEL_URL: process.env.VERCEL_URL,
};
class Config {
  public authRoutes: Partial<AuthPageRoutes> = {};
  public fronteggAppOptions: Partial<FronteggAppOptions> = {};

  get appUrl(): string {
    return generateAppUrl();
  }

  get testUrl(): string | undefined {
    return getEnvOrDefault(EnvVariables.FRONTEGG_TEST_URL, setupEnvVariables.FRONTEGG_TEST_URL);
  }

  get baseUrl(): string {
    return getEnv(EnvVariables.FRONTEGG_BASE_URL) ?? setupEnvVariables.FRONTEGG_BASE_URL;
  }

  get baseUrlHost(): string {
    return new URL(this.baseUrl).hostname;
  }

  get clientId(): string {
    return getEnv(EnvVariables.FRONTEGG_CLIENT_ID) ?? setupEnvVariables.FRONTEGG_CLIENT_ID;
  }

  get cookieName(): string {
    const cookieNameEnv = getEnvOrDefault(
      EnvVariables.FRONTEGG_COOKIE_NAME,
      setupEnvVariables.FRONTEGG_COOKIE_NAME ?? 'fe_session'
    );
    return `${cookieNameEnv}-${this.clientId.replace(/-/g, '')}`;
  }

  get cookieDomain(): string {
    return generateCookieDomain(this.appUrl);
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
    return this.fronteggAppOptions.hostedLoginBox ?? false;
  }

  get appEnvConfig(): AppEnvConfig {
    return {
      envAppUrl: this.appUrl,
      envBaseUrl: this.baseUrl,
      envClientId: this.clientId,
    };
  }
}

export { EnvVariables } from './constants';
export default new Config();
