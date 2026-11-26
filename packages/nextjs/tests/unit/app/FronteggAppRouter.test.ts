import { describe, it, expect, vi } from 'vitest';
import type { ReactElement } from 'react';

const NOT_FOUND_ERROR = 'NEXT_NOT_FOUND';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error(NOT_FOUND_ERROR);
  }),
}));
vi.mock('../../../src/common/FronteggRouterBase', () => ({ FronteggRouterBase: () => null }));

import { FronteggAppRouter } from '../../../src/app/FronteggAppRouter';
import { FronteggRouterBase } from '../../../src/common/FronteggRouterBase';

type RouterBaseProps = { pathArr: string[]; queryParams?: Record<string, string>; isAppDirEnabled?: boolean };

const LOGIN_PARAMS = { 'frontegg-router': ['account', 'login'] };
const UNKNOWN_PARAMS = { 'frontegg-router': ['not-a-frontegg-route'] };
const QUERY = { redirectUrl: '/session' };

const expectRouterBase = (element: ReactElement<RouterBaseProps>) => {
  expect(element.type).toBe(FronteggRouterBase);
  expect(element.props).toEqual({ pathArr: ['account', 'login'], queryParams: QUERY, isAppDirEnabled: true });
};

describe('FronteggAppRouter', () => {
  it('renders the router synchronously for plain params (Next.js 13/14)', () => {
    const element = FronteggAppRouter({ params: LOGIN_PARAMS, searchParams: QUERY });

    expectRouterBase(element as ReactElement<RouterBaseProps>);
  });

  it('awaits promise params and searchParams (Next.js 15+)', async () => {
    const result = FronteggAppRouter({ params: Promise.resolve(LOGIN_PARAMS), searchParams: Promise.resolve(QUERY) });

    expect(result).toBeInstanceOf(Promise);
    expectRouterBase((await result) as ReactElement<RouterBaseProps>);
  });

  it('calls notFound for a non-auth route with plain params', () => {
    // + Assert
    expect(() => FronteggAppRouter({ params: UNKNOWN_PARAMS, searchParams: {} })).toThrow(NOT_FOUND_ERROR);
  });

  it('rejects with notFound for a non-auth route with promise params', async () => {
    const result = FronteggAppRouter({ params: Promise.resolve(UNKNOWN_PARAMS), searchParams: Promise.resolve({}) });

    await expect(result).rejects.toThrow(NOT_FOUND_ERROR);
  });
});
