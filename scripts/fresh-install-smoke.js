/**
 * Fresh-install smoke build: does a brand-new Next.js app that installs the packed SDK build?
 *
 * The repo's yarn.lock pins transitive dependencies, so CI never sees what a customer gets from
 * `npm install` today. This copies an example app out of the monorepo, installs the SDK tarball
 * with NO lockfile (latest matching transitive versions), and runs `next build`.
 *
 * Usage:
 *   node scripts/fresh-install-smoke.js --tarball <path.tgz> --example <app|pages> --next <version>
 *   (or --sdk-version <npm version> instead of --tarball, e.g. to check a published release)
 *     [--react <version>] [--out <dir>]
 *
 * Exits non-zero when install or build fails. Type errors in the example code are ignored on
 * purpose: this checks that the SDK bundles and builds, not that the examples type-check.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const EXAMPLES = {
  app: path.join(ROOT, 'packages/example-app-directory'),
  pages: path.join(ROOT, 'packages/example-pages'),
};
const SKIPPED = new Set(['node_modules', 'package.json', 'tsconfig.json', 'next.config.js', 'next-env.d.ts']);
const DEFAULT_REACT = { 14: '18.3.1', 15: '19.1.0' };
const ENCRYPTION_PASSWORD_BYTES = 32;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, '')] = argv[i + 1];
  }
  if ((!args.tarball && !args['sdk-version']) || !EXAMPLES[args.example] || !args.next) {
    throw new Error(
      'Usage: (--tarball <path.tgz> | --sdk-version <version>) --example <app|pages> --next <version> [--react <version>] [--out <dir>]'
    );
  }
  const major = args.next.split('.')[0];
  return {
    sdk: args.tarball ? `file:${path.resolve(args.tarball)}` : args['sdk-version'],
    example: args.example,
    next: args.next,
    react: args.react || DEFAULT_REACT[major] || DEFAULT_REACT[15],
    out: path.resolve(args.out || fs.mkdtempSync(path.join(os.tmpdir(), `fe-smoke-${args.example}-${major}-`))),
  };
}

function copySource(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from, { withFileTypes: true })
    .filter((entry) => !SKIPPED.has(entry.name) && !entry.name.startsWith('.'))
    .forEach((entry) => fs.cpSync(path.join(from, entry.name), path.join(to, entry.name), { recursive: true }));
}

function writeAppFiles(dir, { sdk, next, react }) {
  const reactMajor = react.split('.')[0];
  const packageJson = {
    name: 'frontegg-nextjs-fresh-install-smoke',
    private: true,
    dependencies: {
      '@frontegg/nextjs': sdk,
      next,
      react,
      'react-dom': react,
      typescript: '^5',
      '@types/node': '^20',
      '@types/react': `^${reactMajor}`,
      '@types/react-dom': `^${reactMajor}`,
    },
  };
  const tsconfig = {
    compilerOptions: {
      target: 'es2017',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: false,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'node',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [{ name: 'next' }],
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
    exclude: ['node_modules'],
  };
  const nextConfig =
    '/** @type {import("next").NextConfig} */\n' +
    'module.exports = { eslint: { ignoreDuringBuilds: true }, typescript: { ignoreBuildErrors: true } };\n';

  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(packageJson, null, 2));
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
  fs.writeFileSync(path.join(dir, 'next.config.js'), nextConfig);
}

function run(command, args, cwd, env) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  console.log(`Fresh-install smoke: @frontegg/nextjs ${options.sdk}, ${options.example} router, next@${options.next}, react@${options.react}`);
  console.log(`App directory: ${options.out}`);

  copySource(EXAMPLES[options.example], options.out);
  writeAppFiles(options.out, options);

  const env = {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: '1',
    FRONTEGG_BASE_URL: process.env.FRONTEGG_BASE_URL || 'https://demo.frontegg.com',
    FRONTEGG_CLIENT_ID: process.env.FRONTEGG_CLIENT_ID || crypto.randomUUID(),
    FRONTEGG_APP_URL: process.env.FRONTEGG_APP_URL || 'http://localhost:3000',
    FRONTEGG_ENCRYPTION_PASSWORD:
      process.env.FRONTEGG_ENCRYPTION_PASSWORD || crypto.randomBytes(ENCRYPTION_PASSWORD_BYTES).toString('hex'),
  };
  run('npm', ['install', '--no-audit', '--no-fund', '--no-package-lock'], options.out, env);
  const webcrypto = path.join(options.out, 'node_modules/@peculiar/webcrypto/package.json');
  if (fs.existsSync(webcrypto)) {
    console.log(`Installed @peculiar/webcrypto ${JSON.parse(fs.readFileSync(webcrypto, 'utf-8')).version}`);
  }
  run('npx', ['next', 'build'], options.out, env);
  console.log(`\nFresh-install smoke build passed (${options.example}, next@${options.next}).`);
}

try {
  main();
} catch (error) {
  console.error(`\nFresh-install smoke build failed: ${error.message}`);
  process.exit(1);
}
