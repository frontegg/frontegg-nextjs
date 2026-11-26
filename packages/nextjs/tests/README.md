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

`vitest.config.ts` measures all of `src/` (type-only files excluded). Thresholds: **lines 95%**, **statements 95%**, **functions 95%**, **branches 90%**. New source files are picked up automatically, so add tests alongside them.

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

### Mocked E2E setup

`tests/e2e/mocked/fixtures/intercepts.ts` exports `setupFronteggMocks(page)` which stubs:

- `POST /identity/resources/auth/v1/user/token/refresh`
- `GET /identity/resources/users/v2/me`
- `POST /oauth/logout`

Authenticated scenarios forge `fe_session` cookies with `fixtures/session-forge.ts`: the JWT inside is signed with a test RSA key, and the cookie is sealed with `FRONTEGG_ENCRYPTION_PASSWORD`. The example app accepts them only if its `.env.local` trusts the test public key (`fixtures/test-public-jwk.json`) and uses the same password. Generate that file once from the repo root:

```bash
node scripts/prepare-e2e-env-file.js          # skips if .env.local already exists
node scripts/prepare-e2e-env-file.js --force  # overwrite an existing .env.local
```

`FRONTEGG_APP_URL`, `FRONTEGG_BASE_URL`, `FRONTEGG_CLIENT_ID` and `FRONTEGG_ENCRYPTION_PASSWORD` are taken from the environment when set; otherwise test defaults are used (random client ID and password, `https://demo.frontegg.com`). Playwright loads the same `.env.local`, so the tests and the app always agree. A few API-proxy specs pass through to `FRONTEGG_BASE_URL`, so they need network access to it.

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

Real-tenant tests run on every push (`push.yml`) and nightly (`.github/workflows/nightly-e2e.yml`).

## CI

`.github/workflows/push.yml` on every push (all steps are blocking):

1. Install, build, generate a throwaway `FRONTEGG_ENCRYPTION_PASSWORD` for the run
2. `yarn test:unit:coverage` in `packages/nextjs`: fails below the thresholds in `vitest.config.ts`; uploads `coverage/` as an artifact
3. Root-level `npx playwright test` for the `tests/middleware-test/` stress suite
4. `npx playwright test --project=unit-playwright` in `packages/nextjs`
5. `node scripts/prepare-e2e-env-file.js --force`, then `npx playwright test --project=e2e-mocked` in `packages/nextjs`
6. `npx playwright test --project=e2e-real` in `packages/nextjs` against the tenant in the `FRONTEGG_BASE_URL` / `FRONTEGG_CLIENT_ID` repo secrets, or the public demo tenant (`demo.frontegg.com`) when they are not set

`publish.yml` and `publish-prerelease.yml` run `yarn test` (vitest + `unit-playwright`) before tagging or publishing.

`.github/workflows/nightly-e2e.yml` runs `--project=e2e-real` on a cron + manual dispatch.

## Known bugs marked with `it.fails`

These tests assert the correct behaviour and are expected to fail until the source is fixed. When one starts passing, vitest reports it: remove the `.fails` marker in the same change as the fix.

- `tests/unit/config/index.test.ts`: `config.clientId` never falls back to the value read at startup (misplaced `??` in `src/config/index.ts`).
- `tests/unit/utils/useOnRedirectTo/index.server.test.ts`: `typeof window == undefined` is always false, so a server-side redirect with `{ refresh: true }` throws.
- `tests/unit/utils/cookies/index.gaps.test.ts`: session cookies split into 10+ chunks are reassembled out of order.
