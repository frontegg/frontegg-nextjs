import type { Page, Route } from '@playwright/test';

/**
 * Canned Frontegg identity endpoints used by e2e-mocked specs.
 *
 * These routes are registered via `page.route` so no real network calls leave
 * the Playwright browser. The payload shapes mirror what the Frontegg identity
 * service returns so that `@frontegg/nextjs` middleware + hooks behave
 * realistically without requiring a real tenant.
 */

export const MOCK_ACCESS_TOKEN =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLW1vY2siLCJpYXQiOjAsImV4cCI6OTk5OTk5OTk5OX0.mock-signature';
export const MOCK_REFRESH_TOKEN = 'mock-refresh-token';

export const MOCK_USER = {
  id: 'user-mock',
  email: 'mock-user@example.com',
  name: 'Mock User',
  profilePictureUrl: null,
  verified: true,
  metadata: '{}',
  roles: [],
  permissions: [],
  tenantId: 'tenant-mock',
  tenantIds: ['tenant-mock'],
  tenants: [
    {
      tenantId: 'tenant-mock',
      name: 'Mock Tenant',
    },
  ],
  activatedForTenant: true,
  isLocked: false,
  mfaEnrolled: false,
  accessToken: MOCK_ACCESS_TOKEN,
  refreshToken: MOCK_REFRESH_TOKEN,
  expiresIn: 3600,
  expires: new Date(Date.now() + 3600 * 1000).toISOString(),
};

export interface MockOptions {
  /**
   * Override the refresh endpoint response — return `401` to simulate an
   * expired session, or `null` to keep the default 200 payload.
   */
  refreshStatus?: number;
  /** When set, captures how many times the refresh endpoint was hit. */
  onRefresh?: () => void;
}

/**
 * Registers the canned Frontegg identity routes on the given page.
 * Call this at the start of each test before any navigation.
 */
export async function setupFronteggMocks(page: Page, options: MockOptions = {}): Promise<void> {
  const { refreshStatus = 200, onRefresh } = options;

  await page.route('**/identity/resources/auth/v1/user/token/refresh', async (route: Route) => {
    onRefresh?.();
    if (refreshStatus !== 200) {
      await route.fulfill({
        status: refreshStatus,
        contentType: 'application/json',
        body: JSON.stringify({ errors: ['Unauthorized'] }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'set-cookie': `fe_refresh_mock=${MOCK_REFRESH_TOKEN}; Path=/; HttpOnly; Secure; SameSite=Strict`,
      },
      body: JSON.stringify({
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        expiresIn: 3600,
        expires: new Date(Date.now() + 3600 * 1000).toISOString(),
      }),
    });
  });

  await page.route('**/identity/resources/users/v2/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USER),
    });
  });

  await page.route('**/oauth/logout', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });
}
