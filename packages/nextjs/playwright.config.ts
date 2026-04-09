import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';

// @ts-ignore
require('dotenv').config();

const isCI = !!process.env.CI;
const realBaseURL = process.env.FRONTEGG_APP_URL ?? 'http://localhost:3000';

const config: PlaywrightTestConfig = {
  testDir: './tests',
  /* Maximum time one test can run for. */
  timeout: 30_000,
  expect: {
    timeout: 5000,
  },
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,
  /* Retry on CI only */
  retries: 0,
  /* Opt out of parallel tests on CI. */
  workers: isCI ? 4 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list', { printSteps: true }],
    ['html', { open: 'never' }],
  ],

  /* Dev server for E2E projects only. unit-playwright does not need it. */
  webServer: process.env.PW_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'yarn workspace @frontegg/example-app-directory dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !isCI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },

  projects: [
    {
      name: 'unit-playwright',
      testMatch: ['middleware/**/*.spec.ts', 'utils/**/*.spec.ts', 'exports/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'e2e-mocked',
      testMatch: ['e2e/mocked/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.FRONTEGG_APP_URL ?? 'http://localhost:3000',
      },
    },
    {
      name: 'e2e-real',
      testMatch: ['e2e/real/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: realBaseURL,
      },
    },
  ],
  globalSetup: './tests/global-setup.ts',
};

export default config;
