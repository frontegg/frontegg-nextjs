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
