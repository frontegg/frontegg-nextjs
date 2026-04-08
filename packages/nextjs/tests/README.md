# Testing `@frontegg/nextjs`

This package has two parallel test systems. Pick the right tool for the kind of test you're writing.

## At a glance

| Kind                | Runner     | Location                     | Run with                     |
| ------------------- | ---------- | ---------------------------- | ---------------------------- |
| Unit                | Vitest     | `tests/unit/**/*.test.ts`    | `yarn test:unit`             |
| Legacy unit/export  | Playwright | `tests/{middleware,utils,exports}/**/*.spec.ts` | `yarn test:e2e --project=unit-playwright` |
| E2E mocked          | Playwright | `tests/e2e/mocked/**/*.spec.ts` | `yarn test:e2e --project=e2e-mocked` |
| E2E real tenant     | Playwright | `tests/e2e/real/**/*.spec.ts`   | `yarn test:e2e --project=e2e-real`   |

`yarn test` runs `test:unit` followed by the existing Playwright flow.

## Unit tests (Vitest)

**Config:** `vitest.config.ts` (jsdom env, v8 coverage).
**Global setup:** `tests/unit/setup.ts` — mocks `fronteggLogger`, clears mocks between tests.
**TS:** `tests/unit/tsconfig.json` extends the package tsconfig and adds `vitest/globals` + `node` types.

### Commands

```bash
yarn test:unit              # run once
yarn test:unit:watch        # watch mode
yarn test:unit:coverage     # with v8 coverage + HTML report in coverage/
```

### Coverage gates

`vitest.config.ts` currently enforces the following on the initial slice of the codebase:

- `src/utils/cookies/**`
- `src/utils/refreshAccessTokenIfNeeded/**`

Thresholds: **lines 80%**, **statements 80%**, **functions 80%**, **branches 75%**.

When you add tests for a new module, add it to the `coverage.include` array in `vitest.config.ts` and hit the same gates.

### Writing a new unit test

1. Create `tests/unit/<area>/<subject>.test.ts`. Mirror the `src/` directory structure.
2. Read the real source file before writing tests. Don't guess signatures.
3. Mock at the **boundary of the module under test**, not inside it:
   - Mock `src/config` (singleton), `src/utils/cookies` (when testing `refreshAccessTokenIfNeeded`), external libraries (`iron-session`, `jose`, `@frontegg/js`, `next/...`).
   - Do NOT mock the module under test's own internal helpers — let them run.
   - `fronteggLogger` is globally mocked already.
4. Use `vi.mock('<path>', factory)` for ESM default exports:
   ```ts
   vi.mock('../../../../src/config', () => ({
     default: { isHostedLogin: true, cookieDomain: 'example.com', /* ... */ },
   }));
   ```
5. Use `vi.mocked(fn).mockReturnValue(...)` inside each test to control per-scenario behavior.
6. Follow TDD: write the assertion, verify it fails against the real impl, refine, commit.

Reference: `tests/unit/utils/cookies/index.test.ts` and `tests/unit/utils/refresh/index.test.ts` are the canonical examples. Fixtures live alongside as `fixtures.ts`.

## E2E tests (Playwright)

**Config:** `playwright.config.ts` defines three projects:

| Project           | What it runs                                      | Needs webServer? |
| ----------------- | ------------------------------------------------- | ---------------- |
| `unit-playwright` | Legacy unit/export specs under `tests/{middleware,utils,exports}` | No |
| `e2e-mocked`      | Mocked scenarios against `example-app-directory` | Yes (auto-boots) |
| `e2e-real`        | Real-tenant smoke against a running Frontegg tenant | Yes              |

The webServer entry boots `packages/example-app-directory` on `http://localhost:3000`. Set `PW_SKIP_WEBSERVER=1` to disable when running tests against an already-running server.

### Running

```bash
# Legacy unit-style Playwright specs (no server)
yarn test:e2e --project=unit-playwright

# Mocked E2E (auto-boots example app)
yarn test:e2e --project=e2e-mocked

# Real tenant — requires env vars, otherwise every test skips
FRONTEGG_BASE_URL=... FRONTEGG_CLIENT_ID=... FRONTEGG_APP_URL=http://localhost:3000 \
  yarn test:e2e --project=e2e-real
```

### Mocked E2E scenarios and the session-cookie caveat

`tests/e2e/mocked/fixtures/intercepts.ts` exports `setupFronteggMocks(page)` which stubs:

- `POST /identity/resources/auth/v1/user/token/refresh`
- `GET /identity/resources/users/v2/me`
- `POST /oauth/logout`

Scenarios that require the browser to arrive **already authenticated** (e.g. "home page renders with user name", "token refresh near expiry", "concurrent dedup") skip by default because forging a valid encrypted `fe_session` cookie requires either importing `src/**` (forbidden in the test slice) or running a real login.

To enable them, set:

- `FRONTEGG_E2E_MOCK_SESSION_COOKIE` — a valid, encrypted session cookie value
- `FRONTEGG_E2E_MOCK_NEAR_EXPIRY_COOKIE` — a session cookie with a short-lived access token

Generate these once from a real login run (either manually or via a future fixture helper), then export them in your shell / CI secrets.

The unauthenticated scenario (first visit redirects to login) runs without setup.

### Writing a new mocked E2E test

1. Create `tests/e2e/mocked/<scenario>.spec.ts`.
2. `import { setupFronteggMocks } from './fixtures/intercepts'` and call it in `test.beforeEach`.
3. For authenticated scenarios, set session cookies via `page.context().addCookies([...])` using the env-var fallback pattern in `login-logout.spec.ts`.
4. Assert against navigation, DOM text, and `page.context().cookies()`.

### Writing a real-tenant test

`tests/e2e/real/smoke.spec.ts` shows the pattern. Always gate with:

```ts
test.skip(
  !process.env.FRONTEGG_BASE_URL || !process.env.FRONTEGG_CLIENT_ID,
  'real-tenant env vars not set',
);
```

Real-tenant tests run only in the nightly workflow (`.github/workflows/nightly-e2e.yml`) or manually via `workflow_dispatch`.

## CI

`.github/workflows/push.yml` on every PR:

1. Install, build
2. `yarn test:unit:coverage` in `packages/nextjs` — uploads `coverage/` as an artifact
3. Root-level `npx playwright test` for the `tests/middleware-test/` stress suite (unchanged)
4. `npx playwright test --project=unit-playwright --project=e2e-mocked` in `packages/nextjs`

`.github/workflows/nightly-e2e.yml` runs `--project=e2e-real` on a cron + manual dispatch.

## What's NOT covered yet

The following are deliberately out of scope for the current test slice:

- React component tests (`src/app/*`, `src/pages/*`, `src/no-ssr/*`, `src/common/*`)
- Edge runtime (`src/edge/**`) — needs an edge test environment
- API handlers (`src/api/**`)
- Middleware proxy callbacks (`ProxyRequestCallback.ts`, `ProxyResponseCallback.ts`)
- Encryption utilities (`src/utils/encryption/**`, `src/utils/encryption-edge/**`)

See `docs/plans/2026-04-08-initial-test-coverage.md` for the roadmap of follow-up slices.
