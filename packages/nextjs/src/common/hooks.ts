import { useLoginActions, useRootState } from '@frontegg/react-hooks';
import { ContextHolder } from '@frontegg/rest-api';
import { buildLogoutRoute } from '../api/urls';

/**
 * Hook to logout client side for hosted login
 * @returns {Function} logout function to be used in the client side for hosted login
 * @param redirectUrl - The URL to redirect to after successful logout will be window.location.href by default.
 * @deprecated use `const { logout } = useLoginActions();`
 */

export const useLogoutHostedLogin = () => {
  const { appName } = useRootState();
  const { logout } = useLoginActions();

  return (redirectUrl?: string) => {
    const contextBaseUrl = ContextHolder.for(appName).getContext()?.baseUrl;
    const baseUrl = typeof contextBaseUrl === 'function' ? contextBaseUrl('') : contextBaseUrl;
    const finalRedirectUrl = redirectUrl ?? window.location.href;
    const logoutRoute = buildLogoutRoute(finalRedirectUrl, baseUrl).asPath;
    logout(() => {
      window.location.href = logoutRoute;
    });
  };
};
