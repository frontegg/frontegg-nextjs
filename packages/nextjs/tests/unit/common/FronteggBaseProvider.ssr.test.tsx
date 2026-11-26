// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('@frontegg/react-hooks', async () => {
  const react = await import('react');
  return {
    FronteggStoreProvider: vi.fn((props: any) =>
      react.createElement(react.Fragment, null, props.alwaysVisibleChildren, props.children)
    ),
    CustomComponentRegister: vi.fn(() => null),
    useAuthActions: () => ({ requestAuthorize: vi.fn(), setAuthState: vi.fn() }),
    useStore: () => ({ store: { auth: {} } }),
  };
});
vi.mock('@frontegg/rest-api', () => ({ ContextHolder: { for: () => ({ setOnRedirectTo: vi.fn() }) } }));
vi.mock('../../../src/utils/initializeFronteggApp', () => ({ default: vi.fn(() => ({ store: {} })) }));
vi.mock('../../../src/utils/useOnRedirectTo', () => ({ default: vi.fn() }));
vi.mock('../../../src/config', () => ({ default: { fronteggAppOptions: {} } }));

import { CustomComponentRegister, FronteggStoreProvider } from '@frontegg/react-hooks';
import { FronteggBaseProvider } from '../../../src/common/FronteggBaseProvider';

describe('FronteggBaseProvider on the server', () => {
  it('renders children without client only always visible children', () => {
    // Act
    const html = renderToString(
      <FronteggBaseProvider router={{} as any} {...({ alwaysVisibleChildren: <em>always</em> } as any)}>
        <span>child</span>
      </FronteggBaseProvider>
    );

    // Assert
    expect(html).toBe('<span>child</span>');
    expect(vi.mocked(FronteggStoreProvider as any).mock.calls[0][0].alwaysVisibleChildren).toBeUndefined();
    expect(CustomComponentRegister).not.toHaveBeenCalled();
  });
});
