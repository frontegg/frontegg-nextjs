import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';
import { randomBytes } from 'crypto';
import { FLOWS } from './tests/e2e/flows/fixtures/env';

/**
 * Server-side flow E2E: example apps run against a local mock Frontegg backend
 * (tests/e2e/mock-frontegg/server.js), so the SDK's server-to-Frontegg calls are real HTTP.
 * Run with: npx playwright test -c playwright.flows.config.ts
 */

// Shared by the app servers (which seal cookies) and the tests (which forge cookies).
// Set once in the main process; workers inherit it.
process.env.FRONTEGG_ENCRYPTION_PASSWORD ||= randomBytes(32).toString('hex');
process.env.FRONTEGG_CLIENT_ID = FLOWS.clientId;

const isCI = !!process.env.CI;
const SERVER_START_TIMEOUT_MS = 180_000;

function appEnv(appUrl: string, distDir: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    FRONTEGG_BASE_URL: FLOWS.mockBaseUrl,
    FRONTEGG_CLIENT_ID: FLOWS.clientId,
    FRONTEGG_APP_URL: appUrl,
    FRONTEGG_ENCRYPTION_PASSWORD: process.env.FRONTEGG_ENCRYPTION_PASSWORD as string,
    // Empty on purpose: forces the SDK to download the JWKS from the mock backend.
    FRONTEGG_JWT_PUBLIC_KEY: '',
    NEXT_DIST_DIR: distDir,
    ...extra,
  };
}

function exampleApp(workspace: string, port: number, env: Record<string, string>) {
  return {
    command: `yarn workspace ${workspace} dev -p ${port}`,
    // Readiness probe on a route the middleware bypasses; also warms up the router page compile.
    url: `http://localhost:${port}/account/login`,
    reuseExistingServer: !isCI,
    timeout: SERVER_START_TIMEOUT_MS,
    stdout: 'pipe' as const,
    stderr: 'pipe' as const,
    env,
  };
}

const config: PlaywrightTestConfig = {
  testDir: './tests/e2e/flows',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // The mock backend's request log and config are global, so tests must not run concurrently.
  workers: 1,
  forbidOnly: isCI,
  retries: 0,
  reporter: [
    ['list', { printSteps: true }],
    ['html', { open: 'never', outputFolder: 'playwright-report-flows' }],
  ],
  webServer: [
    {
      command: 'node tests/e2e/mock-frontegg/server.js',
      url: `${FLOWS.mockBaseUrl}/.well-known/jwks.json`,
      reuseExistingServer: !isCI,
      env: { MOCK_FRONTEGG_PORT: String(FLOWS.mockPort), FRONTEGG_CLIENT_ID: FLOWS.clientId },
    },
    exampleApp(
      '@frontegg/example-app-directory',
      FLOWS.embeddedPort,
      appEnv(FLOWS.embeddedAppUrl, '.next-e2e-embedded')
    ),
    exampleApp(
      '@frontegg/example-app-directory',
      FLOWS.hostedPort,
      // Secure JWT makes the middleware exchange the hosted-login code on the server.
      appEnv(FLOWS.hostedAppUrl, '.next-e2e-hosted', {
        FRONTEGG_HOSTED_LOGIN: 'true',
        FRONTEGG_SECURE_JWT_ENABLED: 'true',
        FRONTEGG_CLIENT_SECRET: 'e2e-client-secret',
      })
    ),
    exampleApp('@frontegg/example-pages', FLOWS.pagesPort, appEnv(FLOWS.pagesAppUrl, '.next-e2e-pages')),
  ],
  projects: [
    {
      name: 'flows-embedded',
      testMatch: ['embedded/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'], baseURL: FLOWS.embeddedAppUrl },
    },
    {
      name: 'flows-hosted',
      testMatch: ['hosted/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'], baseURL: FLOWS.hostedAppUrl },
    },
    {
      name: 'flows-pages',
      testMatch: ['pages/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'], baseURL: FLOWS.pagesAppUrl },
    },
  ],
};

export default config;
