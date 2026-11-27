import { describe, it, expect, vi, afterEach } from 'vitest';
import { createTenantResolverForClientProvider } from '../../../src/app/createTenantResolverForClientProvider';

const stubLocation = (location: Partial<Location>) => vi.stubGlobal('window', { location });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createTenantResolverForClientProvider', () => {
  it('returns no resolver without custom login options', () => {
    expect(createTenantResolverForClientProvider(undefined)).toBeUndefined();
  });

  it('resolves the tenant from the configured subdomain index', () => {
    stubLocation({ hostname: 'acme.eu.example.com', search: '' });
    const resolver = createTenantResolverForClientProvider({ subDomainIndex: 0 } as any)!;

    // & Assert
    expect(resolver()).toEqual({ tenant: 'acme' });
  });

  it('resolves an undefined tenant when the host has no subdomain', () => {
    stubLocation({ hostname: 'example.com', search: '' });
    const resolver = createTenantResolverForClientProvider({ subDomainIndex: 0 } as any)!;

    expect(resolver()).toEqual({ tenant: undefined });
  });

  it('resolves the tenant from the configured query param', () => {
    stubLocation({ hostname: 'app.example.com', search: '?org=acme&x=1' });
    const resolver = createTenantResolverForClientProvider({ paramKey: 'org' } as any)!;

    expect(resolver()).toEqual({ tenant: 'acme' });
  });

  it('resolves an undefined tenant when the query param is missing or empty', () => {
    stubLocation({ hostname: 'app.example.com', search: '?org=' });
    const resolver = createTenantResolverForClientProvider({ paramKey: 'org' } as any)!;

    expect(resolver()).toEqual({ tenant: undefined });
  });

  it('prefers the subdomain over the query param when both are configured', () => {
    stubLocation({ hostname: 'acme.example.com', search: '?org=other' });
    const resolver = createTenantResolverForClientProvider({ subDomainIndex: 0, paramKey: 'org' } as any)!;

    expect(resolver()).toEqual({ tenant: 'acme' });
  });

  it('resolves no tenant when options configure neither strategy', () => {
    stubLocation({ hostname: 'acme.example.com', search: '?org=acme' });
    const resolver = createTenantResolverForClientProvider({} as any)!;

    expect(resolver()).toEqual({});
  });

  it('resolves no tenant when reading the location throws', () => {
    vi.stubGlobal('window', {
      get location(): Location {
        throw new Error('no window');
      },
    });
    const resolver = createTenantResolverForClientProvider({ subDomainIndex: 0 } as any)!;

    expect(resolver()).toEqual({});
  });
});
