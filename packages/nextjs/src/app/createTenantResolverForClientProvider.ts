import { CustomLoginOptionsType } from '../types';

export const createTenantResolverForClientProvider = (customLoginOptions?: CustomLoginOptionsType) => {
  if (!customLoginOptions) {
    return undefined;
  }

  return () => {
    try {
      const { subDomainIndex, paramKey } = customLoginOptions;
      if (subDomainIndex !== undefined) {
        const tenant = window.location.hostname.split('.').slice(0, -2)[subDomainIndex];
        return { tenant };
      }
      if (paramKey) {
        const params = new URLSearchParams(window.location.search);
        const tenant = params.get(paramKey) || undefined;
        return { tenant };
      }
      return {};
    } catch {
      return {};
    }
  };
};
