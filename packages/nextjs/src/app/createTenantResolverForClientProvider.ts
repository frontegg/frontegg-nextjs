import { ResolvedTenantResult } from '@frontegg/rest-api';
import { CustomLoginOptionsType, CustomLoginParamKeyType, CustomLoginSubDomainType } from '../types';

const isCustomLoginStrategyParamKey = (
  customLoginOptions: CustomLoginOptionsType
): customLoginOptions is CustomLoginParamKeyType => customLoginOptions.strategy === 'paramKey';

const isCustomLoginStrategySubDomain = (
  customLoginOptions: CustomLoginOptionsType
): customLoginOptions is CustomLoginSubDomainType => customLoginOptions.strategy === 'subDomain';

const emptyTenantResponse = {} as ResolvedTenantResult;

export const createTenantResolverForClientProvider = (customLoginOptions?: CustomLoginOptionsType) => {
  if (!customLoginOptions) {
    return undefined;
  }
  return () => {
    try {
      if (isCustomLoginStrategySubDomain(customLoginOptions)) {
        const { subDomainIndex } = customLoginOptions;
        return { tenant: window.location.hostname.split('.')[subDomainIndex] };
      } else if (isCustomLoginStrategyParamKey(customLoginOptions)) {
        const { paramKey } = customLoginOptions;
        const params = new URLSearchParams(window.location.search);
        const tenant = params.get(paramKey);
        return { tenant };
      }
      return emptyTenantResponse;
    } catch {
      return emptyTenantResponse;
    }
  };
};
