import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

const CONFIG_BASE = vi.hoisted(() => ({
  appUrl: 'https://app.example.com',
  authRoutes: {} as Record<string, string>,
  isHostedLogin: false,
}));

vi.mock('../../../src/config', () => ({ default: { ...CONFIG_BASE } }));
vi.mock('next/router', () => ({ useRouter: vi.fn() }));
vi.mock('../../../src/common/FronteggRouterBase', () => ({ FronteggRouterBase: vi.fn(() => null) }));

import config from '../../../src/config';
import { useRouter } from 'next/router';
import { FronteggRouterBase } from '../../../src/common/FronteggRouterBase';
import {
  FronteggRouter,
  FronteggRouterProps,
  FronteggStaticPaths,
  FronteggStaticRouterProps,
} from '../../../src/pages/FronteggRouter';

const mockedUseRouter = vi.mocked(useRouter);
const mockedRouterBase = vi.mocked(FronteggRouterBase);

beforeEach(() => {
  Object.assign(config, { ...CONFIG_BASE, authRoutes: {} });
});

describe('FronteggRouter', () => {
  it('passes the catch all path segments and the remaining query to the router base', () => {
    // Arrange
    mockedUseRouter.mockReturnValue({
      query: { 'frontegg-router': ['account', 'login'], redirectUrl: '/x' },
      route: '/[...frontegg-router]',
    } as any);

    // Act
    renderToString(<FronteggRouter />);

    // Assert
    expect(mockedRouterBase.mock.calls[0][0]).toEqual({
      pathArr: ['account', 'login'],
      queryParams: { redirectUrl: '/x' },
    });
  });

  it('falls back to the route path when the catch all segment is null', () => {
    mockedUseRouter.mockReturnValue({ query: { 'frontegg-router': null }, route: '/account/login' } as any);

    renderToString(<FronteggRouter />);

    expect(mockedRouterBase.mock.calls[0][0].pathArr).toEqual(['account/login']);
  });
});

describe('FronteggRouterProps', () => {
  it('renders frontegg auth routes', () => {
    expect(FronteggRouterProps({ resolvedUrl: '/account/login?x=1', req: {} })).toEqual({
      notFound: false,
      props: {},
    });
  });

  it('returns not found for non auth routes', () => {
    expect(FronteggRouterProps({ resolvedUrl: '/dashboard', req: {} }).notFound).toBe(true);
  });

  it('falls back to the request url without a resolved url', () => {
    expect(FronteggRouterProps({ req: { url: '/account/sign-up' } }).notFound).toBe(false);
  });

  it('resolves client side data requests from the catch all query array', () => {
    // Arrange
    const context = {
      resolvedUrl: '/_next/data/build-id/account/logout.json',
      req: { query: { 'frontegg-router': ['account', 'logout'] } },
    };

    // Act & Assert
    expect(FronteggRouterProps(context).notFound).toBe(false);
  });

  it('resolves client side data requests from a single query value', () => {
    const context = {
      resolvedUrl: '/_next/data/build-id/dashboard.json',
      req: { query: { 'frontegg-router': 'dashboard' } },
    };

    expect(FronteggRouterProps(context).notFound).toBe(true);
  });

  it('limits auth routes to login, logout and callback on hosted login', () => {
    Object.assign(config, { isHostedLogin: true });

    expect(FronteggRouterProps({ resolvedUrl: '/account/login', req: {} }).notFound).toBe(false);
    expect(FronteggRouterProps({ resolvedUrl: '/account/sign-up', req: {} }).notFound).toBe(true);
  });
});

describe('static routing helpers', () => {
  it('returns empty static props', () => {
    expect(FronteggStaticRouterProps()).toEqual({ props: {} });
  });

  it('lists every auth route except the authenticated root with fallback enabled', () => {
    // Act
    const { paths, fallback } = FronteggStaticPaths();

    // Assert
    expect(fallback).toBe(true);
    expect(paths).toContain('/account/login');
    expect(paths).toContain('/oauth/callback');
    expect(paths).not.toContain('/');
  });

  it('includes overridden auth routes', () => {
    Object.assign(config, { authRoutes: { loginUrl: '/signin' } });

    expect(FronteggStaticPaths().paths).toContain('/signin');
  });
});
