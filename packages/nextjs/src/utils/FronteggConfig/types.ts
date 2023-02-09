export interface GeneratedEnvVariables {
  /** Generate cookieDomain based on {@link FronteggEnvVariables.appUrl} */
  cookieDomain: string;
}


/**
 * PasswordMap used for JWT encryption, you can create multiple passwords
 * to be used for encrypting session cookie as round-robin strategy.
 */
export type PasswordsMap = { [id: string]: string };

export interface FronteggEnvVariables extends GeneratedEnvVariables {
  /** {@link EnvVariables.FRONTEGG_APP_URL} */
  appUrl: string;
  /** {@link EnvVariables.FRONTEGG_BASE_URL} */
  baseUrl: string;
  /** {@link EnvVariables.FRONTEGG_TEST_URL} */
  testUrl?: string;
  /** {@link EnvVariables.FRONTEGG_CLIENT_ID} */
  clientId: string;
  /** {@link EnvVariables.FRONTEGG_ENCRYPTION_PASSWORD} */
  encryptionPassword: PasswordsMap;
  /** {@link EnvVariables.FRONTEGG_COOKIE_NAME} */
  cookieName: string;
}

/**
 * PropTypes passed by FronteggProvider to the ClientSide Frontegg components.
 */
export interface AppEnvConfig {
  /** {@link EnvVariables.FRONTEGG_APP_URL} */
  envAppUrl?: string;
  /** {@link EnvVariables.FRONTEGG_BASE_URL} */
  envBaseUrl?: string;
  /** {@link EnvVariables.FRONTEGG_CLIENT_ID} */
  envClientId?: string;
}
