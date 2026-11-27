import type { Mock } from 'vitest';
import type { FronteggProviderOptions } from '../../../../src/types';

/** Shared fixtures for initializeFronteggApp tests. */

export const APP_URL = 'https://app.example.com';
export const BASE_URL = 'https://tenant.frontegg.com';

export const baseOptions = (overrides: Partial<FronteggProviderOptions> = {}): FronteggProviderOptions =>
  ({
    envAppUrl: APP_URL,
    envBaseUrl: BASE_URL,
    envClientId: 'client-id',
    envAppId: 'app-id',
    ...overrides,
  }) as FronteggProviderOptions;

/** Return the contextOptions passed to the most recent createStore call. */
export const lastStoreContext = (createStore: Mock) =>
  createStore.mock.calls[createStore.mock.calls.length - 1][0].context;
