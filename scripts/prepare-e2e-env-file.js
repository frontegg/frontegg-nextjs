// Writes the example app's .env.local for mocked E2E (test JWT key + shared password); keeps an existing file unless --force.
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
