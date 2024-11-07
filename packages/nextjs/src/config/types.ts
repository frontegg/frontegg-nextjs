/**
 * PasswordMap used for JWT encryption, you can create multiple passwords
 * to be used for encrypting session cookie as round-robin strategy.
 */
export type PasswordsMap = { [id: string]: string };

/**
 * PropTypes passed by FronteggProvider to the ClientSide Frontegg components.
 */
export interface AppEnvConfig {
  /** {@link EnvVariables.FRONTEGG_APP_URL} */
  envAppUrl: string;
  /** {@link EnvVariables.FRONTEGG_BASE_URL} */
  envBaseUrl: string;
  /** {@link EnvVariables.FRONTEGG_CLIENT_ID} */
  envClientId: string;
  /** {@link EnvVariables.FRONTEGG_APP_ID} */
  envAppId?: string;

  /** {@link EnvVariables.FRONTEGG_SECURE_JWT_ENABLED} */
  secureJwtEnabled?: boolean;
  /** {@link EnvVariables.FRONTEGG_HOSTED_LOGIN} */
  envHostedLoginBox?: boolean;
}
