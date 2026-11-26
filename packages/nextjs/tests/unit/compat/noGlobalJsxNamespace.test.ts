import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../../src');
// Matches `JSX.Something` that is not qualified as `React.JSX.Something`.
const GLOBAL_JSX_USAGE = /(?<![\w.])JSX\.\w+/;

const listSourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(fullPath);
    }
    return /\.tsx?$/.test(entry.name) ? [fullPath] : [];
  });

const findGlobalJsxUsages = (filePath: string): string[] =>
  fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
    .filter(({ line }) => GLOBAL_JSX_USAGE.test(line))
    .map(({ lineNumber }) => `${path.relative(SRC_DIR, filePath)}:${lineNumber}`);

describe('React 19 type compatibility', () => {
  it('does not reference the global JSX namespace, which @types/react 19 removed', () => {
    const sourceFiles = listSourceFiles(SRC_DIR);

    const usages = sourceFiles.flatMap(findGlobalJsxUsages);

    expect(usages).toEqual([]);
  });
});
