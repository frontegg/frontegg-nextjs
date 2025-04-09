export enum EnvVariables {
  /**
   * The AppUrl is to tell Frontegg your application's app url
   * for generating cookies and proxy http requests
   */
  FRONTEGG_APP_URL = 'FRONTEGG_APP_URL',
  /**
   * The Frontegg domain is your unique URL to connect to the Frontegg gateway, get it by visit:
   * - For Dev environment [visit](https://portal.frontegg.com/development/settings/domains)
   * - For Prod environment [visit](https://portal.frontegg.com/production/settings/domains)
   */
  FRONTEGG_BASE_URL = 'FRONTEGG_BASE_URL',
  /**
   * The Frontegg test domain used for testing proxy middleware
   * @private for Frontegg
   */
  FRONTEGG_TEST_URL = 'FRONTEGG_TEST_URL',

  /**
   * Your Frontegg application's Client ID, get it by visit:
   * - For Dev environment [visit](https://portal.frontegg.com/development/settings/general)
   * - For Prod environment [visit](https://portal.frontegg.com/production/settings/general)
   */
  FRONTEGG_CLIENT_ID = 'FRONTEGG_CLIENT_ID',

  /**
   * Your Frontegg application ID, get it by visit:
   * - For Dev environment [visit](https://portal.frontegg.com/development/applications)
   * - For Prod environment [visit](https://portal.frontegg.com/production/applications)
   */
  FRONTEGG_APP_ID = 'FRONTEGG_APP_ID',

  /**
   * Rewrite the cookie name by the Frontegg application ID
   * to support multiple Frontegg applications with same domain
   */
  FRONTEGG_REWRITE_COOKIE_BY_APP_ID = 'FRONTEGG_REWRITE_COOKIE_BY_APP_ID',

  /**
   * Your Frontegg application's Client Secret, get it by visit:
   * - For Dev environment [visit](https://portal.frontegg.com/development/settings/general)
   * - For Prod environment [visit](https://portal.frontegg.com/production/settings/general)
   */
  FRONTEGG_CLIENT_SECRET = 'FRONTEGG_CLIENT_SECRET',

  /**
   * Your Frontegg application's Shared Secret, get it by visit:
   * - For Dev environment [visit](https://portal.frontegg.com/development/applications/[YOUR_APP_ID])
   * - For Prod environment [visit](https://portal.frontegg.com/production/applications/[YOUR_APP_ID])
   */
  FRONTEGG_SHARED_SECRET = 'FRONTEGG_SHARED_SECRET',

  /**
   * The stateless session encryption password, used to encrypt
   * JWT before sending it to the client side.
   *
   * For quick password generation use the following command:
   *
   * ```sh
   *   node -e "console.log(crypto.randomBytes(32).toString('hex'))"
   * ```
   */
  FRONTEGG_ENCRYPTION_PASSWORD = 'FRONTEGG_ENCRYPTION_PASSWORD',

  /**
   * The JWT public key generated by frontegg, to verify JWT before create session,
   * get it by visit: https://[YOUR_FRONTEGG_FOMAIN]/.well-known/jwks.json.
   *
   * Then: Copy and Paste the first key from the response:
   * {keys: [{__KEY__}]}
   */
  FRONTEGG_JWT_PUBLIC_KEY = 'FRONTEGG_JWT_PUBLIC_KEY',

  /**
   * The stateless cookie name for storing the encrypted JWT
   * value as session cookies for supporting getServerSideProps and ServerComponents
   */
  FRONTEGG_COOKIE_NAME = 'FRONTEGG_COOKIE_NAME',

  /**
   * The stateless cookie domain for storing the encrypted JWT
   * value as session cookies for supporting getServerSideProps and ServerComponents
   */
  FRONTEGG_COOKIE_DOMAIN = 'FRONTEGG_COOKIE_DOMAIN',

  /**
   * The stateless cookie same site value for storing the encrypted JWT
   * default is none, you can set it to 'lax' or 'strict' for more security
   */
  FRONTEGG_COOKIE_SAME_SITE = 'FRONTEGG_COOKIE_SAME_SITE',

  /**
   * When `true`, the initial props will not refresh access token if it's valid.
   */
  DISABLE_INITIAL_PROPS_REFRESH_TOKEN = 'DISABLE_INITIAL_PROPS_REFRESH_TOKEN',

  /**
   * Enable secure JWT by removing the signature from the JWT token.
   * In order to enable this feature, you need to provide {@link EnvVariables.FRONTEGG_CLIENT_SECRET}
   */
  FRONTEGG_SECURE_JWT_ENABLED = 'FRONTEGG_SECURE_JWT_ENABLED',

  /**
   * The Frontegg Hosted Login URL, used to redirect the user to the Frontegg login page
   * set to 'true' to enable the hosted login feature
   */
  FRONTEGG_HOSTED_LOGIN = 'FRONTEGG_HOSTED_LOGIN',

  /**
   * Forward client IP address to Frontegg gateway, used to detect the client's IP address
   * when the Next.js application using frontegg middleware proxy service
   * In order to enable this feature, you need to provide {@link EnvVariables.FRONTEGG_SHARED_SECRET}
   */
  FRONTEGG_FORWARD_IP = 'FRONTEGG_FORWARD_IP',

  /**
   * Where the Nextjs build output will be stored as static files
   * for SSG and ISR pages, this env variable will disable environment variables
   * checking and will not throw an error if the env variables are for SSR
   *
   * NOTE: you cannot use this env with SSR.
   */
  FRONTEGG_SSG_EXPORT = 'FRONTEGG_SSG_EXPORT',
  /**
   * This Env variable assign automatically when deploying you Next.js application
   * to Vercel deployments service, and will be used to detect to dynamically configure
   * the {@link EnvVariables.FRONTEGG_APP_URL}
   *
   * @see [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables#system-environment-variables)
   */
  VERCEL = 'VERCEL',
  VERCEL_URL = 'VERCEL_URL',
}
