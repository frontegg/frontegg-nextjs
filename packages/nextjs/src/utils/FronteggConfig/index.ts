import { AuthPageRoutes } from '@frontegg/redux-store';
import { FronteggAppOptions } from '@frontegg/types';
import { AppEnvConfig, FronteggEnvVariables, PasswordsMap } from './types';
import { getEnvVariables } from './helpers';

class Config {
  public authRoutes: Partial<AuthPageRoutes> = {};
  public fronteggAppOptions: Partial<FronteggAppOptions> = {};
  private envVariables: FronteggEnvVariables;

  constructor() {
    this.envVariables = getEnvVariables();
  }

  get baseUrl(): string {
    return this.envVariables.baseUrl;
  }

  get baseUrlHost(): string {
    return new URL(process.env['FRONTEGG_BASE_URL'] ?? '').hostname;
  }

  get clientId(): string {
    return this.envVariables.clientId;
  }

  get cookieName(): string {
    return this.envVariables.cookieName;
  }

  get password(): PasswordsMap {
    return this.envVariables.encryptionPassword;
  }

  get appUrl(): string {
    return this.envVariables.appUrl;
  }

  get appEnvConfig(): AppEnvConfig {
    return {
      envAppUrl: this.appUrl,
      envBaseUrl: this.baseUrl,
      envClientId: this.clientId,
    };
  }

  get cookieDomain(): string {
    return this.envVariables.cookieDomain;
  }
}

export { EnvVariables } from './constants';
export default new Config();
