import config from '../../config';

export const defaultFronteggRoutes = {
  authenticatedUrl: '/',
  loginUrl: '/account/login',
  stepUpUrl: '/account/step-up',
  logoutUrl: '/account/logout',
  activateUrl: '/account/activate',
  impersonationUrl: '/account/impersonate',
  acceptInvitationUrl: '/account/invitation/accept',
  forgetPasswordUrl: '/account/forget-password',
  resetPhoneNumberUrl: '/account/reset-phone-number',
  resetPasswordUrl: '/account/reset-password',
  socialLoginCallbackUrl: '/account/social/success',
  signUpUrl: '/account/sign-up',
  oidcRedirectUrl: '/account/oidc/callback',
  samlCallbackUrl: '/account/saml/callback',
  magicLinkCallbackUrl: '/account/login/magic-link',
  hostedLoginRedirectUrl: '/oauth/callback',
  openAppUrl: '/account/redirect',
};

export function getAuthRoutes(): { routesArr: string[]; routesObj: Record<string, string> } {
  const routesObj = {
    ...defaultFronteggRoutes,
    ...config.authRoutes,
  };
  const routesArr: string[] = Object.keys(routesObj).reduce(
    (p: string[], key: string) => [...p, (routesObj as any)[key]],
    []
  );
  return { routesArr, routesObj };
}

export function isAuthRoute(pathname: string): boolean {
  const { routesArr, routesObj } = getAuthRoutes();

  if (config.isHostedLogin) {
    return (
      routesObj.loginUrl === pathname ||
      routesObj.logoutUrl === pathname ||
      routesObj.hostedLoginRedirectUrl === pathname
    );
  } else {
    return pathname !== routesObj.authenticatedUrl && routesArr.indexOf(pathname) !== -1;
  }
}

/**
 * Resolve the hosted login callback path, honoring an application level override of
 * `authOptions.routes.hostedLoginRedirectUrl`.
 *
 * The middleware callback detection and the authorization code exchange must agree on
 * this value: the `redirect_uri` sent at exchange time has to match the one the code was
 * issued against, otherwise the exchange is rejected.
 */
export function getHostedLoginRedirectPath(): string {
  const path = config.authRoutes?.hostedLoginRedirectUrl ?? defaultFronteggRoutes.hostedLoginRedirectUrl;
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Build the absolute `redirect_uri` used for the hosted login authorization code exchange.
 *
 * When the callback path is the application root the path is dropped entirely, so the
 * resulting URI is the bare app URL rather than a trailing slash variant of it.
 */
export function buildHostedLoginRedirectUri(): string {
  const path = getHostedLoginRedirectPath();
  if (path === '/') {
    /**
     * The callback is the app root, so the URI is the app URL with no path appended.
     * A trailing slash is dropped here because the redirect being matched carries no
     * path at all.
     */
    return config.appUrl.endsWith('/') ? config.appUrl.slice(0, -1) : config.appUrl;
  }
  /**
   * Concatenated verbatim, without normalizing a trailing slash on the app URL. This
   * value has to match the `redirect_uri` sent at authorize time, which is built from
   * the same unnormalized app URL, so normalizing only one side would break the exchange.
   */
  return `${config.appUrl}${path}`;
}

/**
 * Whether a request path is the hosted login callback.
 *
 * An application may point the callback at its root, in which case the path alone matches
 * everything and the authorization code is what tells a callback apart from a normal page
 * request.
 */
export function isHostedLoginCallbackPath(pathname: string, hasCode: boolean): boolean {
  const path = getHostedLoginRedirectPath();
  if (path === '/') {
    return hasCode;
  }
  return pathname.startsWith(path);
}
