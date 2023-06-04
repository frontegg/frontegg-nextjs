import { useLoginActions } from '@frontegg/react-hooks';
import { ContextHolder } from '@frontegg/rest-api';
import { buildLogoutRoute } from '../api/urls';

type UseLogoutHostedOptions = {
  redirectUrl?: string;
};

/**
 * Hook to logout client side for hosted login
 */

export const useLogoutHostedLogin = () => {
  const { logout } = useLoginActions();

  return (redirectUrl?: string) => {
    const contextBaseUrl = ContextHolder.getContext()?.baseUrl;
    const baseUrl = typeof contextBaseUrl === 'function' ? contextBaseUrl('') : contextBaseUrl;
    const finalRedirectUrl = redirectUrl ?? window.location.href;
    const logoutRoute = buildLogoutRoute(finalRedirectUrl, baseUrl).asPath;
    logout(() => {
      window.location.href = logoutRoute;
    });
  };
};
