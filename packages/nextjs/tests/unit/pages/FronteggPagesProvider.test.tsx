import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('next/router', () => ({ useRouter: vi.fn() }));
vi.mock('../../../src/common', () => ({ FronteggBaseProvider: vi.fn((props: any) => props.children) }));

import { useRouter } from 'next/router';
import { FronteggBaseProvider } from '../../../src/common';
import FronteggPagesProvider from '../../../src/pages/FronteggPagesProvider';

const mockedUseRouter = vi.mocked(useRouter);
const mockedBaseProvider = vi.mocked(FronteggBaseProvider);

describe('FronteggPagesProvider', () => {
  it('passes the next router and its base path to the base provider', () => {
    // Arrange
    const router = { basePath: '/docs' } as any;
    mockedUseRouter.mockReturnValue(router);

    // Act
    const html = renderToString(
      <FronteggPagesProvider {...({ envAppUrl: 'https://app.example.com' } as any)}>
        <i>child</i>
      </FronteggPagesProvider>
    );

    // Assert
    expect(html).toBe('<i>child</i>');
    expect(mockedBaseProvider.mock.calls[0][0]).toMatchObject({
      router,
      basename: '/docs',
      envAppUrl: 'https://app.example.com',
    });
  });

  it('prefers an explicit basename over the router base path', () => {
    mockedUseRouter.mockReturnValue({ basePath: '/docs' } as any);

    renderToString(<FronteggPagesProvider {...({ basename: '/custom' } as any)} />);

    expect((mockedBaseProvider.mock.calls[0][0] as any).basename).toBe('/custom');
  });
});
