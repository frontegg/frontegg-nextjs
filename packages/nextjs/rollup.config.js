import resolve from '@rollup/plugin-node-resolve';
import ts from 'rollup-plugin-typescript2';
import path from 'path';
import clientComponentPlugin from '../../scripts/rollup-plugins/clientComponentPlugin';
import movePackageJsonPlugin from '../../scripts/rollup-plugins/movePackageJsonPlugin';

const distFolder = path.join(__dirname, './dist/');

const createCommonConfiguration = (outputFormat) => ({
  external: (id) => !(path.isAbsolute(id) || id.startsWith('.')),
  plugins: [
    resolve({
      browser: false,
      preferBuiltins: false,
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    }),
    movePackageJsonPlugin(distFolder),
    ts({
      tsconfig: `${__dirname}/tsconfig.json`,
      useTsconfigDeclarationDir: true,
      tsconfigOverride: {
        compilerOptions: {
          declaration: true,
          declarationDir: distFolder,
          target: 'ES5',
          module: 'ES6',
        },
      },
    }),
    clientComponentPlugin(),
  ],
  output: {
    dir: distFolder,
    sourcemap: true,
    format: outputFormat,
  },
});

export default [
  {
    input: './src/index.ts',
    ...createCommonConfiguration('cjs'),
  },
  {
    input: {
      'server/index': './src/server/index.ts',
      'client/index': './src/client/index.ts',
      'common/index': './src/common/index.ts',
      'edge/index': './src/edge/index.ts',
    },
    ...createCommonConfiguration('esm'),
  },
];