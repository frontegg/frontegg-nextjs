import { CustomLoginOptionsType } from '../types';

export const createTenantResolverForClientProvider = ({ subDomainIndex, paramKey }: CustomLoginOptionsType) => {
  if (subDomainIndex && paramKey) {
    throw new Error('subDomainIndex and paramKey cannot be used together only one strategy is allowed');
  }
  return () => {
    if (subDomainIndex) {
      return { tenant: window.location.hostname.split('.')[subDomainIndex] };
    } else if (paramKey) {
      const params = new URLSearchParams(window.location.search);
      const tenant = params.get(paramKey);
      return { tenant };
    }
    return { tenant: null };
  };
};
