import { AuthPageRoutes } from '@frontegg/redux-store';
import { WithFronteggAppOptions } from '../pages';
import { AppEnvConfig, PasswordsMap } from './types';
import { IpResolverFunction } from '../middleware/types';
import { generateAppUrl, generateCookieDomain, getEnv, getEnvOrDefault, normalizeStringPasswordToMap } from './helpers';
import { EnvVariables } from './constants';
import { FronteggEnvNotFound, InvalidFronteggEnv } from '../utils/errors';

const setupEnvVariables = {
  FRONTEGG_APP_URL: process.env.FRONTEGG_APP_URL,
  FRONTEGG_BASE_URL: process.env.FRONTEGG_BASE_URL,
  FRONTEGG_TEST_URL: process.env.FRONTEGG_TEST_URL,
  FRONTEGG_CLIENT_ID: process.env.FRONTEGG_CLIENT_ID,
  FRONTEGG_APP_ID: process.env.FRONTEGG_APP_ID,
  FRONTEGG_REWRITE_COOKIE_BY_APP_ID: process.env.FRONTEGG_REWRITE_COOKIE_BY_APP_ID,
  FRONTEGG_CLIENT_SECRET: process.env.FRONTEGG_CLIENT_SECRET,
  FRONTEGG_SHARED_SECRET: process.env.FRONTEGG_SHARED_SECRET,
  FRONTEGG_ENCRYPTION_PASSWORD: process.env.FRONTEGG_ENCRYPTION_PASSWORD,
  FRONTEGG_COOKIE_NAME: process.env.FRONTEGG_COOKIE_NAME,
  FRONTEGG_COOKIE_DOMAIN: process.env.FRONTEGG_COOKIE_DOMAIN,
  FRONTEGG_COOKIE_SAME_SITE: process.env.FRONTEGG_COOKIE_SAME_SITE,
  FRONTEGG_JWT_PUBLIC_KEY: process.env.FRONTEGG_JWT_PUBLIC_KEY,
  FRONTEGG_SECURE_JWT_ENABLED: process.env.FRONTEGG_SECURE_JWT_ENABLED,
  FRONTEGG_FORWARD_IP: process.env.FRONTEGG_FORWARD_IP,
  FRONTEGG_SSG_EXPORT: process.env.FRONTEGG_SSG_EXPORT,
  DISABLE_INITIAL_PROPS_REFRESH_TOKEN: process.env.DISABLE_INITIAL_PROPS_REFRESH_TOKEN,
  VERCEL: process.env.VERCEL,
  VERCEL_URL: process.env.VERCEL_URL,
};

class Config {
  public fronteggAppOptions: Partial<WithFronteggAppOptions> = {};
  private _ipResolver?: IpResolverFunction;

  constructor() {
    if (!this.isSSGExport) {
      if (typeof window === 'undefined') {
        this.validatePassword();
      }
    }
  }

  get isSSGExport(): boolean {
    const isSSGExport =
      getEnvOrDefault(EnvVariables.FRONTEGG_SSG_EXPORT, setupEnvVariables.FRONTEGG_SSG_EXPORT) ?? 'false';
    return isSSGExport === 'true';
  }

  get appUrl(): string {
    return generateAppUrl();
  }

  get testUrl(): string | undefined {
    return getEnvOrDefault(EnvVariables.FRONTEGG_TEST_URL, setupEnvVariables.FRONTEGG_TEST_URL);
  }

  get baseUrl(): string {
    const baseUrl = getEnvOrDefault(EnvVariables.FRONTEGG_BASE_URL, setupEnvVariables.FRONTEGG_BASE_URL);
    if (!baseUrl) {
      throw new FronteggEnvNotFound(EnvVariables.FRONTEGG_BASE_URL);
    }
    if (baseUrl.endsWith('/')) {
      return baseUrl.slice(0, -1);
    }
    return baseUrl;
  }

  get baseUrlHost(): string {
    return new URL(this.baseUrl).hostname;
  }

  get clientId(): string {
    const clientId = getEnv(EnvVariables.FRONTEGG_CLIENT_ID ?? setupEnvVariables.FRONTEGG_CLIENT_ID);
    if (!clientId) {
      throw new FronteggEnvNotFound(EnvVariables.FRONTEGG_CLIENT_ID);
    }
    return clientId;
  }

  get appId(): string | undefined {
    return getEnvOrDefault(EnvVariables.FRONTEGG_APP_ID, setupEnvVariables.FRONTEGG_APP_ID);
  }

  get rewriteCookieByAppId(): boolean {
    return (
      getEnvOrDefault(
        EnvVariables.FRONTEGG_REWRITE_COOKIE_BY_APP_ID,
        setupEnvVariables.FRONTEGG_REWRITE_COOKIE_BY_APP_ID ?? 'false'
      ) === 'true'
    );
  }

  get clientSecret(): string | undefined {
    let clientSecret;
    try {
      clientSecret = getEnv(EnvVariables.FRONTEGG_CLIENT_SECRET) ?? setupEnvVariables.FRONTEGG_CLIENT_SECRET;
    } catch (e) {
      clientSecret = setupEnvVariables.FRONTEGG_CLIENT_SECRET;
    }

    if (this.secureJwtEnabled && !clientSecret) {
      throw new InvalidFronteggEnv(
        EnvVariables.FRONTEGG_CLIENT_SECRET,
        'Client secret is required when secure JWT is enabled'
      );
    }
    return clientSecret;
  }

  get sharedSecret(): string | undefined {
    let sharedSecret;
    try {
      sharedSecret = getEnv(EnvVariables.FRONTEGG_SHARED_SECRET) ?? setupEnvVariables.FRONTEGG_SHARED_SECRET;
    } catch (e) {
      sharedSecret = setupEnvVariables.FRONTEGG_SHARED_SECRET;
    }

    return sharedSecret;
  }

  get shouldForwardIp(): boolean {
    return (
      getEnvOrDefault(EnvVariables.FRONTEGG_FORWARD_IP, setupEnvVariables.FRONTEGG_FORWARD_IP ?? 'false') === 'true'
    );
  }

  get jwtPublicKeyJson(): string | undefined {
    return getEnv(EnvVariables.FRONTEGG_JWT_PUBLIC_KEY) ?? setupEnvVariables.FRONTEGG_JWT_PUBLIC_KEY;
  }

  get secureJwtEnabled(): boolean {
    return (
      getEnvOrDefault(
        EnvVariables.FRONTEGG_SECURE_JWT_ENABLED,
        setupEnvVariables.FRONTEGG_SECURE_JWT_ENABLED ?? 'false'
      ) == 'true'
    );
  }

  get cookieName(): string {
    const cookieNameEnv = getEnvOrDefault(
      EnvVariables.FRONTEGG_COOKIE_NAME,
      setupEnvVariables.FRONTEGG_COOKIE_NAME ?? 'fe_session'
    );

    if (this.rewriteCookieByAppId && this.appId) {
      return `${cookieNameEnv}-${this.appId.replace(/-/g, '')}`;
    } else {
      return `${cookieNameEnv}-${this.clientId.replace(/-/g, '')}`;
    }
  }

  get cookieDomain(): string {
    return getEnvOrDefault(
      EnvVariables.FRONTEGG_COOKIE_DOMAIN,
      setupEnvVariables.FRONTEGG_COOKIE_DOMAIN ?? generateCookieDomain(this.appUrl)
    );
  }

  get cookieSameSite(): 'lax' | 'strict' | 'none' {
    let sameSite = getEnvOrDefault(
      EnvVariables.FRONTEGG_COOKIE_SAME_SITE,
      setupEnvVariables.FRONTEGG_COOKIE_SAME_SITE ?? 'none'
    );
    switch (sameSite) {
      case 'true':
        return 'strict';
      case 'false':
        return 'none';
      case 'lax':
      case 'strict':
      case 'none':
        return sameSite;
      default:
        return 'none';
    }
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
    const encryptionPasswordEnv = getEnvOrDefault(
      EnvVariables.FRONTEGG_ENCRYPTION_PASSWORD,
      setupEnvVariables.FRONTEGG_ENCRYPTION_PASSWORD
    );

    if (!encryptionPasswordEnv) {
      throw new InvalidFronteggEnv(
        EnvVariables.FRONTEGG_ENCRYPTION_PASSWORD,
        `Hex string.\n\nFor quick password generation use the following command:\nnode -e "console.log(crypto.randomBytes(32).toString('hex'))"`
      );
    }
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

  get isVercel(): boolean {
    return getEnvOrDefault(EnvVariables.VERCEL, setupEnvVariables.VERCEL) === '1';
  }

  get disableInitialPropsRefreshToken(): boolean {
    const disableInitialPropsRefreshToken = getEnvOrDefault(
      EnvVariables.DISABLE_INITIAL_PROPS_REFRESH_TOKEN,
      setupEnvVariables.DISABLE_INITIAL_PROPS_REFRESH_TOKEN
    );
    return disableInitialPropsRefreshToken === 'true';
  }

  get ipResolver(): IpResolverFunction | undefined {
    return this._ipResolver;
  }

  set ipResolver(fn: IpResolverFunction | undefined) {
    this._ipResolver = fn;
  }

  get appEnvConfig(): AppEnvConfig {
    const config = {
      envAppUrl: this.appUrl,
      envBaseUrl: this.baseUrl,
      envClientId: this.clientId,
      envAppId: this.appId,
      secureJwtEnabled: this.secureJwtEnabled,
      envHostedLoginBox: this.isHostedLogin,
    };
    return config;
  }

  checkHostedLoginConfig(options: WithFronteggAppOptions | undefined) {
    // noinspection JSDeprecatedSymbols
    if (options?.hostedLoginBox === undefined) {
      return;
    }
    // noinspection JSDeprecatedSymbols
    if (options.hostedLoginBox != this.isHostedLogin) {
      throw new Error(
        'There is mismatch between FRONTEGG_HOSTED_LOGIN environment variable and withFronteggOptions, ' +
          'please remove the hostedLoginBox from withFronteggOptions and use the FRONTEGG_HOSTED_LOGIN environment variable instead.'
      );
    }
  }
}

export { EnvVariables } from './constants';
export default new Config();
