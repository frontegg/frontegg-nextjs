import { useLoginActions } from '@frontegg/react-hooks';
import { ContextHolder } from '@frontegg/rest-api';
import { buildLogoutRoute } from '../api/urls';

type UseLogoutHostedOptions = {
  goBackToOrigin?: boolean;
};

/**
 * Hook to logout client side for hosted login
 * @param options
 */
export const useLogoutHostedLogin = (options?: UseLogoutHostedOptions) => {
  const goBackToOrigin = options?.goBackToOrigin ?? false;
  const { logout } = useLoginActions();
  const isSSR = typeof window === 'undefined';

  if (isSSR) {
    return () => {};
  }

  const contextBaseUrl = ContextHolder.getContext()?.baseUrl;
  const baseUrl = typeof contextBaseUrl === 'function' ? contextBaseUrl('') : contextBaseUrl;
  const redirectUrl = goBackToOrigin ? window.location.origin : window.location.href;
  const logoutRoute = buildLogoutRoute(redirectUrl, baseUrl).asPath;

  return () => {
    logout(() => {
      window.location.href = logoutRoute;
    });
  };
};
