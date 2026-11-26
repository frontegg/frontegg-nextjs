import { describe, it, expect } from 'vitest';
import * as mainEntry from '../../../src';
import { createSessionFromAccessToken, getTokensFromCookie } from '../../../src/utils/sessionTokens';

/**
 * The main `@frontegg/nextjs` entry is imported by customers' client and server code alike.
 * Moving server-only helpers out of client paths must not drop anything from it.
 */
describe('@frontegg/nextjs main entry', () => {
  it.each([
    'FronteggBaseProvider',
    'AuthorizedContent',
    'AppContext',
    'getAfterAuthRedirectUrl',
    'UsersTable',
    'InviteUserDialog',
    'ChangePasswordForm',
    'ProfilePage',
    'EditEmailForm',
    'useUsersTable',
    'useInviteUserDialog',
    'FronteggProviderNoSSR',
    'AdminPortal',
    'useAuthUser',
  ])('exports %s', (name) => {
    expect(mainEntry).toHaveProperty(name);
  });

  it('still exports the server session helpers, now implemented in utils/sessionTokens', () => {
    expect(mainEntry.createSessionFromAccessToken).toBe(createSessionFromAccessToken);
    expect(mainEntry.getTokensFromCookie).toBe(getTokensFromCookie);
  });
});
