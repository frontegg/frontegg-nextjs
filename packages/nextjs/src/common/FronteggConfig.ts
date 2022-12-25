import { AppEnvConfig } from './types';
import { importJWK, KeyLike } from 'jose';
import { AuthPageRoutes } from '@frontegg/redux-store';
import { FronteggAppOptions } from '@frontegg/types';

export type PasswordsMap = { [id: string]: string };
export type Password = string | PasswordsMap;

export function normalizeStringPasswordToMap(password: Password) {
  return typeof password === 'string' ? { 1: password } : password;
}

class FronteggConfig {
  private readonly _cookieName: string;
  private readonly _password: string;
  private _jwtPublicKey: KeyLike | Uint8Array | undefined;
  private readonly _passwordsAsMap: PasswordsMap;
  private readonly _clientId: string;
  public authRoutes: Partial<AuthPageRoutes> = {};
  public fronteggAppOptions: Partial<FronteggAppOptions> = {};

  constructor() {
    this._clientId = process.env['FRONTEGG_CLIENT_ID'] ?? '';
    this._cookieName = process.env['FRONTEGG_COOKIE_NAME'] ?? `fe_next_session`;
    this._password = process.env['FRONTEGG_ENCRYPTION_PASSWORD'] ?? '';
    this._passwordsAsMap = normalizeStringPasswordToMap(this._password);
  }

  get cookieName(): string {
    return `${this._cookieName}-${this._clientId.replace(/-/g, '')}`;
  }

  get password(): string {
    return this._password;
  }

  get clientId(): string {
    return this._clientId;
  }

  get baseUrlHost(): string {
    return new URL(process.env['FRONTEGG_BASE_URL'] ?? '').hostname;
  }

  getEnvAppUrl(): string | undefined {
    let url: string | undefined = undefined;
    if (process.env['FRONTEGG_APP_URL']) {
      url = process.env['FRONTEGG_APP_URL'];
    } else if (process.env['VERCEL'] && process.env['VERCEL_URL']) {
      url = process.env['VERCEL_URL'];
    }
    if (url && !url.startsWith('http')) {
      const protocol = url.startsWith('localhost') ? 'http://' : 'https://';
      url = `${protocol}${url}`;
    }
    return url;
  }

  get appUrl(): string {
    return this.getEnvAppUrl() ?? 'http://localhost:3000';
  }

  get appEnvConfig(): AppEnvConfig {
    return {
      envAppUrl: this.getEnvAppUrl(),
      envBaseUrl: process.env['FRONTEGG_BASE_URL'],
      envClientId: process.env['FRONTEGG_CLIENT_ID'],
    };
  }

  get cookieDomain(): string {
    return new URL(this.getEnvAppUrl() ?? '').hostname.replace(/:(\d)+$/, '');
  }

  async getJwtPublicKey(): Promise<KeyLike | Uint8Array> {
    if (!this._jwtPublicKey) {
      const response = await fetch(`${process.env['FRONTEGG_BASE_URL']}/.well-known/jwks.json`);
      const data = await response.json();
      const publicKey = data.keys.find((key: any) => key.kty === 'RSA');
      this._jwtPublicKey = await importJWK(publicKey);
    }
    return this._jwtPublicKey;
  }

  get passwordsAsMap(): PasswordsMap {
    return this._passwordsAsMap;
  }
}

export default new FronteggConfig();
