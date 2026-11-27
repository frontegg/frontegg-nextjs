import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('@frontegg/react-hooks', () => ({ useAuthUserOrNull: vi.fn() }));

import { useAuthUserOrNull } from '@frontegg/react-hooks';
import AuthorizedContent from '../../../src/common/AuthorizedContent';

const mockedUseUser = vi.mocked(useAuthUserOrNull);

const givenUser = (user: Record<string, any> | null) => mockedUseUser.mockReturnValue(user as any);
const keys = (...values: string[]) => values.map((key) => ({ key }));

const renderContent = (props: Record<string, any>) =>
  renderToString(<AuthorizedContent {...props}>secret</AuthorizedContent>);

describe('AuthorizedContent', () => {
  it('renders children when nothing is required', () => {
    givenUser(null);

    expect(renderContent({})).toBe('secret');
  });

  it('renders children when the user has every required permission and role', () => {
    givenUser({ permissions: keys('read', 'write'), roles: keys('admin') });

    expect(renderContent({ requiredPermissions: ['read', 'write'], requiredRoles: ['admin'] })).toBe('secret');
  });

  it('hides children when a required permission is missing', () => {
    givenUser({ permissions: keys('read'), roles: [] });

    expect(renderContent({ requiredPermissions: ['read', 'write'] })).toBe('');
  });

  it('hides children when the user has no permissions at all', () => {
    givenUser({ permissions: [] });

    expect(renderContent({ requiredPermissions: [] })).toBe('');
  });

  it('hides children when a required role is missing', () => {
    givenUser({ roles: keys('viewer') });

    expect(renderContent({ requiredRoles: ['admin'] })).toBe('');
  });

  it('hides children when the user has no roles at all', () => {
    givenUser({});

    expect(renderContent({ requiredRoles: [] })).toBe('');
  });

  it('hides protected children from anonymous visitors', () => {
    givenUser(null);

    expect(renderContent({ requiredRoles: ['admin'] })).toBe('');
  });

  it('lets super users through regardless of requirements', () => {
    givenUser({ superUser: true });

    expect(renderContent({ requiredPermissions: ['x'], requiredRoles: ['y'] })).toBe('secret');
  });

  it('delegates rendering to the render prop with the authorization result', () => {
    givenUser({ roles: keys('viewer') });
    const render = vi.fn((isAuthorized: boolean) => (isAuthorized ? 'yes' : 'no'));

    const html = renderToString(<AuthorizedContent requiredRoles={['admin']} render={render} />);

    expect(render).toHaveBeenCalledWith(false);
    expect(html).toBe('no');
  });
});
