const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const exec = promisify(childProcess.exec);

const validBundles = [
  'node',
  'stable',
];

async function run(argv) {
  const { bundle, largeFiles, outDir: relativeOutDir, verbose, watch } = argv;

  if (validBundles.indexOf(bundle) === -1) {
    throw new TypeError(
      `Unrecognized bundle '${bundle}'. Did you mean one of "${validBundles.join('", "')}"?`,
    );
  }

  const env = {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    BABEL_ENV: bundle,
    MUI_BUILD_VERBOSE: verbose,
  };
  const babelConfigPath = path.resolve(__dirname, '../babel.config.js');

  const srcDir = path.resolve('./src');
  const pkg = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf-8'));
  const extensions = ['.js', '.ts', '.tsx'];
  const ignore = [
    '**/*.test.js',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/*.d.ts',
  ];

  const outDir = path.resolve(
    relativeOutDir + (pkg.name.startsWith('@frontegg') ? `/${pkg.name}` : ''),
    {
      node: './node',
      stable: './',
    }[bundle],
  );

  const babelArgs = [
    '--config-file',
    babelConfigPath,
    '--extensions',
    `"${extensions.join(',')}"`,
    srcDir,
    '--out-dir',
    outDir,
  ];
  if (largeFiles) {
    babelArgs.push('--compact false');
  }
    babelArgs.push('--source-maps');
  if (watch) {
    babelArgs.push('--watch');
    babelArgs.push('--skip-initial-build');
  }

  babelArgs.push('--ignore');
  // Need to put these patterns in quotes otherwise they might be evaluated by the used terminal.
  babelArgs.push(`"${ignore.join('","')}"`);

  const command = ['yarn babel', ...babelArgs].join(' ');

  if (verbose) {
    // eslint-disable-next-line no-console
    console.log(`running '${command}' with ${JSON.stringify(env)}`);
  }

  const { stderr, stdout } = await exec(command, { env: { ...process.env, ...env } });
  if (stderr) {
    throw new Error(`'${command}' failed with \n${stderr}`);
  }

  if (verbose) {
    // eslint-disable-next-line no-console
    console.log(stdout);
  }
}

run({
  largeFiles: false,
  outDir: process.argv[3] && process.argv[3] !== `--watch` ? process.argv[3] : `../../dist`,
  verbose: false,
  bundle: process.argv[2],
  watch: process.argv[3] === '--watch',
});
