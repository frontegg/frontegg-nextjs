# Initial Test Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use godmode:task-runner to implement this plan task-by-task. Follow TDD (godmode:test-first) and commit after every task.

**Goal:** Establish a scalable unit + E2E testing foundation for `@frontegg/nextjs`, then fully cover two high-risk modules (`utils/cookies` and `utils/refreshAccessTokenIfNeeded`) and add an E2E smoke suite (mocked + real tenant) as a template for the rest of the repo.

**Architecture:**
- **Unit runner:** Vitest (added alongside existing Playwright). Lives in `packages/nextjs`, runs with `jsdom` env, uses Vitest mocks to isolate from `@frontegg/js`, `iron-session`, `jose`, and `next`.
- **E2E runner:** Playwright (existing). Two projects: `e2e-mocked` (intercepts Frontegg API via MSW/route mocks against `example-app-directory`) and `e2e-real` (hits the real Frontegg tenant via env vars already used in CI).
- **Coverage:** `@vitest/coverage-v8`, enforced threshold on the two target modules only for now (80% lines/branches). Expanded per-module as the repo grows.
- **CI:** New `unit` job added to `.github/workflows/push.yml`. Existing `test` job still runs Playwright `.spec.ts` files. E2E-mocked runs on every PR; E2E-real runs on `workflow_dispatch` + nightly.

**Tech Stack:** TypeScript 5.9, Vitest 1.x, @vitest/coverage-v8, jsdom, MSW 2.x (for E2E mocking), Playwright 1.58 (existing), Next.js 14 (existing example apps).

**Scope boundaries (explicitly out of scope for this plan):**
- React component tests (FronteggProvider, etc.) — deferred
- Edge runtime tests (`src/edge/`) — deferred, needs separate edge env setup
- Full migration of existing 11 Playwright unit-style specs — they keep working; new specs go to Vitest
- API handler tests (`src/api/`) — next slice

---

## Phase 0 — Infrastructure

### Task 0.1: Add Vitest dependencies to `packages/nextjs`

**Files:**
- Modify: `packages/nextjs/package.json`

**Step 1:** Add devDependencies

Run from repo root:
```bash
cd packages/nextjs && yarn add -D -W=false \
  vitest@^1.6.0 \
  @vitest/coverage-v8@^1.6.0 \
  jsdom@^24.0.0 \
  @types/node@^20
```

Expected: `yarn.lock` updated, no peer-dep errors.

**Step 2:** Add scripts to `packages/nextjs/package.json`:
```json
"test:unit": "vitest run",
"test:unit:watch": "vitest",
"test:unit:coverage": "vitest run --coverage",
"test:e2e": "playwright test",
"test": "yarn test:unit && node ../../scripts/prepare-env-test-file.js && CI=true npx playwright test"
```
(Replaces the existing `test` script so CI runs both.)

**Step 3:** Commit.
```bash
git add packages/nextjs/package.json ../../yarn.lock
git commit -m "chore(test): add vitest toolchain to @frontegg/nextjs"
```

---

### Task 0.2: Add Vitest config

**Files:**
- Create: `packages/nextjs/vitest.config.ts`
- Create: `packages/nextjs/tests/unit/setup.ts`

**Step 1:** Write `packages/nextjs/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    exclude: ['tests/**/*.spec.ts'], // leave existing Playwright specs alone
    setupFiles: ['./tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/utils/cookies/**',
        'src/utils/refreshAccessTokenIfNeeded/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

**Step 2:** Write `packages/nextjs/tests/unit/setup.ts`:
```ts
import { vi, beforeEach } from 'vitest';

// Silence logger noise in unit tests by default.
vi.mock('../../src/utils/fronteggLogger', () => ({
  default: {
    child: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});
```

**Step 3:** Smoke test — create `tests/unit/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('vitest smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `cd packages/nextjs && yarn test:unit`
Expected: `1 passed`, no errors.

**Step 4:** Delete smoke file, commit.
```bash
rm packages/nextjs/tests/unit/smoke.test.ts
git add packages/nextjs/vitest.config.ts packages/nextjs/tests/unit/setup.ts
git commit -m "chore(test): configure vitest with jsdom and v8 coverage"
```

---

### Task 0.3: Ensure TypeScript recognizes Vitest types

**Files:**
- Modify: `packages/nextjs/tsconfig.json`

**Step 1:** Read current tsconfig, add `"types": ["vitest/globals", "node"]` if missing, and ensure `tests/unit` is included in compilation or has its own tsconfig.

**Step 2:** Verify: `cd packages/nextjs && npx tsc --noEmit`
Expected: no new errors introduced.

**Step 3:** Commit.
```bash
git commit -am "chore(test): expose vitest types to typescript"
```

---

## Phase 1 — `src/utils/cookies/`

**Target files under test:**
- `src/utils/cookies/index.ts` (409 LOC — `CookieManager` singleton, create/modify/remove/get)
- `src/utils/cookies/serializer.ts` (185 LOC — chunking, parsing, seal extraction)
- `src/utils/cookies/helpers.ts`

### Task 1.1: Port existing helpers fixture

**Files:**
- Create: `packages/nextjs/tests/unit/utils/cookies/fixtures.ts`

Move and extend the data from `packages/nextjs/tests/utils/cookies/utils.ts`:
- `SMALL_SEAL` — a 3 kB fake seal string
- `LARGE_SEAL` — a 9 kB fake seal string that forces chunking
- `mockConfig(overrides)` — returns a partial `config` with `cookieDomain`, `isSSL`, `cookieName`
- `mockIncomingMessage(cookies: Record<string,string>)` — builds a fake `IncomingMessage`-ish object
- `mockServerResponse()` — records `setHeader`/`getHeader` calls

**Commit:** `test(cookies): add shared fixtures for cookie unit tests`

### Task 1.2: `serializer.ts` — `chunkString` (+ existing behavior)

Tests to write in `tests/unit/utils/cookies/serializer.test.ts`:
1. returns single chunk for input smaller than chunk size
2. splits exact multiples correctly
3. splits non-multiple lengths (last chunk < chunk size)
4. handles empty string (returns `[]` or `['']` — verify current behavior first)
5. handles unicode characters without splitting code points

Follow TDD: read the function, write failing test against expected contract, run, implement/adjust, commit.

**Commit:** `test(cookies): cover chunkString edge cases`

### Task 1.3: `serializer.ts` — `serialize`/`parse` round-trip

Tests:
1. `serialize({name, value, options})` → `parse` → original structure
2. chunked cookies parse back into single value
3. `maxAge` and `expires` are respected
4. `domain`, `path`, `secure`, `httpOnly`, `sameSite` flags all serialized
5. missing optional options fall back to defaults

**Commit:** `test(cookies): cover serialize/parse round-trip`

### Task 1.4: `CookieManager.create`

Tests in `tests/unit/utils/cookies/index.test.ts`:
1. creates single cookie when session fits in one chunk
2. creates N chunked cookies when session exceeds chunk size
3. cookie name uses `CookieManager.cookieName` prefix
4. `expires` is propagated
5. `secure: true` produces `Secure; SameSite=None`
6. `secure: false` omits `Secure`
7. `cookieDomain` from config is applied
8. respects `req` host header for per-host cookie domain

Mock `config` via `vi.mock('../../src/config', ...)`.

**Commit:** `test(cookies): cover CookieManager.create`

### Task 1.5: `CookieManager.removeCookies`

Tests:
1. removes a single session cookie
2. removes N chunked cookies
3. appends to existing `set-cookie` header instead of overwriting
4. sets `expires` to epoch
5. respects `isSecured` flag

**Commit:** `test(cookies): cover CookieManager.removeCookies`

### Task 1.6: `CookieManager.modifySetCookie`

Tests:
1. rewrites domain on all cookies when `cookieDomain` set
2. adds `Secure` when `isSecured: true`
3. leaves unrelated cookies alone
4. handles both `set-cookie: string` and `set-cookie: string[]`
5. returns `undefined`/`[]` on empty input

**Commit:** `test(cookies): cover CookieManager.modifySetCookie`

### Task 1.7: `CookieManager.getSessionCookieFromRequest`

Tests:
1. returns concatenated seal from chunked cookies in correct order
2. returns single cookie value unchanged
3. returns empty string when cookie missing
4. ignores unrelated cookies
5. handles out-of-order chunk delivery (chunk-2 before chunk-1)

**Commit:** `test(cookies): cover getSessionCookieFromRequest`

### Task 1.8: `CookieManager.getSessionCookieFromRedirectedResponse`

Tests:
1. extracts session cookie from `res.getHeader('set-cookie')`
2. handles string vs array headers
3. returns empty on missing header

**Commit:** `test(cookies): cover getSessionCookieFromRedirectedResponse`

### Task 1.9: Migrate existing Playwright cookie spec

**Files:**
- Delete: `packages/nextjs/tests/utils/cookies/index.spec.ts`
- Delete: `packages/nextjs/tests/utils/cookies/utils.ts`

Ensure every assertion from the Playwright version has a corresponding Vitest test. Run coverage:

```bash
cd packages/nextjs && yarn test:unit:coverage
```

Expected: `src/utils/cookies/**` ≥ 80% lines, ≥ 75% branches.

**Commit:** `test(cookies): migrate playwright cookie specs to vitest`

---

## Phase 2 — `src/utils/refreshAccessTokenIfNeeded/`

### Task 2.1: Shared fixtures

**Files:**
- Create: `packages/nextjs/tests/unit/utils/refresh/fixtures.ts`

Export:
- `mockNextPageContext({ url, cookies, sessionCookieInResponse })` — returns `{ req, res, pathname }` shape
- `mockJwt({ sub, exp, ... })` — returns signed-looking JWT string + decoded payload
- `mockRefreshResponse({ ok, accessToken, refreshToken, setCookieHeaders })` — fake `Response`
- `FRONTEGG_CONFIG_BASE` — baseline config overrides

**Commit:** `test(refresh): add fixtures for token refresh unit tests`

### Task 2.2: `helpers.ts` — `hasRefreshTokenCookie`

Tests:
1. returns `false` for `null`/`undefined`
2. returns `true` for exact match on refresh-token key
3. returns `true` when cookie key matches after stripping dashes
4. returns `false` for unrelated cookies
5. returns `false` for empty object

**Commit:** `test(refresh): cover hasRefreshTokenCookie`

### Task 2.3: `helpers.ts` — `refreshAccessTokenEmbedded`

Mock `../../api` and `CookieManager`. Tests:
1. returns `null` when no refresh-token cookie present
2. calls `api.refreshTokenEmbedded` with request headers when present
3. injects `frontegg-requested-application-id` header when `config.appId` set
4. does not inject app-id header when `config.appId` is undefined
5. propagates `api.refreshTokenEmbedded` response unchanged

**Commit:** `test(refresh): cover refreshAccessTokenEmbedded`

### Task 2.4: `helpers.ts` — `refreshAccessTokenHostedLogin`

Tests:
1. returns `null` when no tokens decoded from cookie
2. returns `null` when `tokens.refreshToken` missing
3. calls `api.refreshTokenHostedLogin` when refresh token present
4. sets `frontegg-requested-application-id` when `config.appId` set
5. handles decode errors by returning `null` (or whatever current behavior is — verify)
6. handles `config.secureJwtEnabled` branch

**Commit:** `test(refresh): cover refreshAccessTokenHostedLogin`

### Task 2.5: `helpers.ts` — `isOauthCallback` / `isSamlCallback` / `isRuntimeNextRequest`

One test file section per helper. Each: positive match, negative match, edge cases (trailing slash, query params, case sensitivity).

**Commit:** `test(refresh): cover url-classification helpers`

### Task 2.6: `helpers.ts` — `saveForwardedSession` / `getForwardedSession`

Tests:
1. `save` then `get` round-trips the session
2. `get` returns `null` when no forwarded session set
3. multiple saves overwrite correctly

**Commit:** `test(refresh): cover forwarded-session helpers`

### Task 2.7: `index.ts` — main `refreshAccessTokenIfNeeded`

File: `tests/unit/utils/refresh/index.test.ts`. Mock: `config`, `CookieManager`, `./helpers`, `../createSession`, `../encryption`, `../../common`, `../../api/utils`.

Tests (one `describe` per branch):

**Early-exit branches:**
1. returns `null` when `ctx.req` is null
2. returns `null` when `ctx.res` is null
3. returns `null` when `req.url` missing
4. when response already has session cookie → calls `getSessionCookieFromRedirectedResponse` and returns the resolved session
5. when response has session cookie but `createSession` returns null → falls back to `getForwardedSession`

**Runtime-request branch:**
6. `isRuntimeNextRequest(url) === true` AND existing valid session → returns it, does NOT call refresh
7. `isRuntimeNextRequest(url) === true` AND session invalid → proceeds to refresh
8. `config.disableInitialPropsRefreshToken` → same behavior as runtime request

**Hosted-login branch:**
9. `config.isHostedLogin && isOauthCallback` → removes cookies, skips refresh
10. `config.isHostedLogin && !isOauthCallback` → calls `refreshAccessTokenHostedLogin`

**Embedded branch:**
11. `!config.isHostedLogin && isSamlCallback` → returns null immediately
12. `!config.isHostedLogin && !isSamlCallback` → calls `refreshAccessTokenEmbedded`

**Client-IP forwarding:**
13. when `config.shouldForwardIp && cf-connecting-ip` → sets `FRONTEGG_FORWARD_IP_HEADER`
14. when `x-forwarded-for` present → uses that
15. when neither → uses `req.socket.remoteAddress`
16. when `shouldForwardIp === false` → does not set forward headers

**Refresh-response handling:**
17. null response → removes cookies, returns null
18. non-ok response → removes cookies, returns null
19. ok response → parses json, calls `createSessionFromAccessToken`, sets cookies, returns session
20. `createSessionFromAccessToken` returns null session → returns null
21. merges incoming `set-cookie` from upstream with new session cookie
22. calls `saveForwardedSession` on success
23. reads `set-cookie` from `response.headers.raw()` path (pre-Next 13.4)
24. reads `set-cookie` from `response.headers.getSetCookie()` path (Next 13.4+)
25. reads `set-cookie` from `response.headers.get('set-cookie')` path (Response fallback)

**Error handling:**
26. thrown error inside try → logs and returns null (does not crash)

Commit after every ~6 tests to keep PRs reviewable.

**Commit messages:**
- `test(refresh): cover early-exit branches of refreshAccessTokenIfNeeded`
- `test(refresh): cover runtime-request and hosted-login branches`
- `test(refresh): cover embedded and ip-forwarding branches`
- `test(refresh): cover refresh-response handling branches`
- `test(refresh): cover set-cookie compatibility shims and error path`

### Task 2.8: Coverage verification

```bash
cd packages/nextjs && yarn test:unit:coverage
```

Expected: `src/utils/refreshAccessTokenIfNeeded/**` ≥ 80% lines/statements, ≥ 75% branches.
If under: identify uncovered branches from the HTML report at `coverage/index.html`, add tests, rerun.

**Commit:** `test(refresh): fill remaining coverage gaps`

---

## Phase 3 — E2E suites

### Task 3.1: Add Playwright project structure

**Files:**
- Modify: `packages/nextjs/playwright.config.ts`

Create two projects:
```ts
projects: [
  {
    name: 'unit-playwright', // legacy
    testMatch: /tests\/(utils|middleware|exports)\/.*\.spec\.ts/,
  },
  {
    name: 'e2e-mocked',
    testMatch: /tests\/e2e\/mocked\/.*\.spec\.ts/,
    use: { baseURL: 'http://localhost:3000' },
  },
  {
    name: 'e2e-real',
    testMatch: /tests\/e2e\/real\/.*\.spec\.ts/,
    use: { baseURL: process.env.FRONTEGG_APP_URL ?? 'http://localhost:3000' },
  },
],
webServer: {
  command: 'cd ../example-app-directory && yarn dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
},
```

**Commit:** `test(e2e): split playwright config into projects`

### Task 3.2: Mocked login/logout smoke test

**Files:**
- Create: `packages/nextjs/tests/e2e/mocked/login-logout.spec.ts`
- Create: `packages/nextjs/tests/e2e/mocked/fixtures/intercepts.ts`

In `intercepts.ts`, export `setupFronteggMocks(page)` that uses `page.route` to intercept:
- `POST **/identity/resources/auth/v1/user/token/refresh` → canned 200 with access/refresh tokens
- `GET **/identity/resources/users/v2/me` → canned user payload
- `POST **/oauth/logout` → 200

Scenarios:
1. unauthenticated visit → `/account/login` redirect (hosted login)
2. with valid session cookie set via `page.context().addCookies(...)` → home page renders with user name
3. click logout → cookies cleared, redirect to login

**Commit:** `test(e2e): add mocked login/logout smoke scenarios`

### Task 3.3: Mocked token-refresh scenario

**Files:**
- Create: `packages/nextjs/tests/e2e/mocked/token-refresh.spec.ts`

Scenarios:
1. session cookie near expiry → page load triggers refresh → new cookies set
2. refresh endpoint returns 401 → cookies removed → redirect to login
3. concurrent navigations only call refresh once (de-dup check)

**Commit:** `test(e2e): cover token refresh mocked scenarios`

### Task 3.4: Real-tenant smoke test (skipped without env)

**Files:**
- Create: `packages/nextjs/tests/e2e/real/smoke.spec.ts`

Top of file:
```ts
test.skip(
  !process.env.FRONTEGG_BASE_URL || !process.env.FRONTEGG_CLIENT_ID,
  'real-tenant env vars not set',
);
```

Scenarios:
1. unauthenticated visit → redirects to `${FRONTEGG_BASE_URL}/oauth/...`
2. public endpoint renders without session
3. health check of `/api/frontegg/identity/resources/configurations/v1`

**Commit:** `test(e2e): add real-tenant smoke suite gated by env vars`

### Task 3.5: CI integration

**Files:**
- Modify: `.github/workflows/push.yml`

Add steps (before the existing `playwright test` step):
```yaml
- name: Unit tests
  working-directory: packages/nextjs
  run: yarn test:unit:coverage

- name: Upload coverage
  uses: actions/upload-artifact@v4
  with:
    name: unit-coverage
    path: packages/nextjs/coverage
    retention-days: 14
```

Modify the Playwright step to run only `e2e-mocked` + `unit-playwright` projects (exclude `e2e-real` from PR CI):
```yaml
- name: Playwright tests
  working-directory: packages/nextjs
  run: npx playwright test --project=unit-playwright --project=e2e-mocked
```

Create `.github/workflows/nightly-e2e.yml`:
```yaml
name: Nightly real-tenant E2E
on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:
jobs:
  e2e-real:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - run: yarn install --frozen-lockfile
      - run: yarn build
      - run: npx playwright install --with-deps chromium
      - name: E2E real
        working-directory: packages/nextjs
        env:
          FRONTEGG_BASE_URL: ${{ secrets.FRONTEGG_BASE_URL }}
          FRONTEGG_CLIENT_ID: ${{ secrets.FRONTEGG_CLIENT_ID }}
          FRONTEGG_ENCRYPTION_PASSWORD: ${{ secrets.FRONTEGG_ENCRYPTION_PASSWORD }}
          FRONTEGG_APP_URL: http://localhost:3000
          FRONTEGG_TEST_URL: http://localhost:3001
        run: npx playwright test --project=e2e-real
```

**Commit:** `ci(test): add unit job, split playwright projects, add nightly real e2e`

---

## Phase 4 — Documentation

### Task 4.1: Testing guide

**Files:**
- Create: `packages/nextjs/tests/README.md`

Content:
- Directory layout (`unit/`, `e2e/mocked/`, `e2e/real/`, `utils/` [legacy])
- How to run: `yarn test:unit`, `yarn test:unit:watch`, `yarn test:e2e`
- How to write a new unit test (link to `tests/unit/utils/cookies/index.test.ts` as reference)
- How to write a new mocked E2E test (link to `tests/e2e/mocked/login-logout.spec.ts`)
- Coverage expectations and how to run locally
- Mocking conventions: what to mock, what not to mock

**Commit:** `docs(test): add testing guide`

---

## Acceptance criteria (definition of done for this plan)

- [ ] `cd packages/nextjs && yarn test:unit` passes locally on a clean clone
- [ ] `yarn test:unit:coverage` shows ≥ 80% lines for `src/utils/cookies/**` and `src/utils/refreshAccessTokenIfNeeded/**`
- [ ] `yarn test:e2e --project=e2e-mocked` passes locally against `example-app-directory`
- [ ] `.github/workflows/push.yml` runs unit + e2e-mocked on PR and uploads coverage
- [ ] Nightly workflow exists for `e2e-real`
- [ ] `packages/nextjs/tests/README.md` exists and is accurate
- [ ] No existing CI tests regressed (all 11 Playwright specs still pass via `unit-playwright` project)
- [ ] No changes to `src/**` — this slice is tests-only

---

## Follow-up slices (next plans, not in this one)

1. API handlers (`src/api/**`) — next highest risk after session
2. Edge runtime (`src/edge/**`) — needs edge test env
3. React provider component tests (`src/app/**`, `src/pages/**`, `src/no-ssr/**`) — React Testing Library
4. Middleware proxy callbacks (`src/middleware/ProxyRequestCallback.ts`, `ProxyResponseCallback.ts`)
5. Encryption (`src/utils/encryption/**`, `src/utils/encryption-edge/**`) — paired with iron-session upgrade if any
