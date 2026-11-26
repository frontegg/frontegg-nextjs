/**
 * Writes packages/example-app-directory/.env.local for the mocked E2E suite
 * (packages/nextjs/tests/e2e/mocked).
 *
 * The mocked tests forge session cookies signed with a test RSA key, so the
 * example app must trust that key (FRONTEGG_JWT_PUBLIC_KEY) and seal cookies
 * with the same encryption password the tests read back via dotenv.
 *
 * Values come from the environment when set, otherwise safe test defaults.
 * An existing .env.local is left alone unless --force is passed, so a
 * developer's real config is never overwritten by accident.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ENV_FILE_PATH = path.join(ROOT, 'packages/example-app-directory/.env.local');
const TEST_PUBLIC_JWK_PATH = path.join(ROOT, 'packages/nextjs/tests/e2e/mocked/fixtures/test-public-jwk.json');
const ENCRYPTION_PASSWORD_BYTES = 32;

function buildEnvVariables(env) {
  const testPublicJwk = JSON.parse(fs.readFileSync(TEST_PUBLIC_JWK_PATH, 'utf-8'));
  return {
    FRONTEGG_APP_URL: env.FRONTEGG_APP_URL || 'http://localhost:3000',
    FRONTEGG_BASE_URL: env.FRONTEGG_BASE_URL || 'https://demo.frontegg.com',
    FRONTEGG_CLIENT_ID: env.FRONTEGG_CLIENT_ID || crypto.randomUUID(),
    FRONTEGG_ENCRYPTION_PASSWORD:
      env.FRONTEGG_ENCRYPTION_PASSWORD || crypto.randomBytes(ENCRYPTION_PASSWORD_BYTES).toString('hex'),
    FRONTEGG_JWT_PUBLIC_KEY: `'${JSON.stringify(testPublicJwk)}'`,
  };
}

function main() {
  const force = process.argv.includes('--force');
  if (fs.existsSync(ENV_FILE_PATH) && !force) {
    console.log(`${path.relative(ROOT, ENV_FILE_PATH)} already exists, leaving it unchanged (pass --force to overwrite).`);
    return;
  }

  const envVariables = buildEnvVariables(process.env);
  const fileContent =
    Object.entries(envVariables)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n';

  fs.writeFileSync(ENV_FILE_PATH, fileContent, { encoding: 'utf-8' });
  console.log(`Wrote ${path.relative(ROOT, ENV_FILE_PATH)} for the mocked E2E suite.`);
}

main();
