// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Guards the client/server boundary at the source level. iron-session's crypto dependency
 * (@peculiar/webcrypto >= 1.6) imports `node:crypto`, which breaks `next build` as soon as
 * it lands in a client bundle. Two rules keep it out:
 *  1. 'use client' modules never import server-only packages, even transitively and even
 *     through a browser-stubbed module.
 *  2. Any other path from a client-reachable entry to iron-session goes through
 *     utils/encryption, which ships a browser stub (index.browser.ts, mapped through the
 *     `browser` field that scripts/copy-files.js writes).
 */
const SRC = path.resolve(__dirname, '../../../src');
const SERVER_ONLY = /^(iron-session$|http-proxy|next\/headers|node:|fs$)/;
const BROWSER_STUBBED = new Set([path.join(SRC, 'utils/encryption/index.ts')]);
const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)\s+(type\s+)?[^'"]*?from\s+['"]([^'"]+)['"]|(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g;

function resolveRelative(from: string, spec: string): string | undefined {
  const base = path.resolve(path.dirname(from), spec);
  return ['', '.ts', '.tsx', '/index.ts', '/index.tsx']
    .map((ext) => base + ext)
    .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

function runtimeImports(file: string): string[] {
  const source = fs.readFileSync(file, 'utf8');
  return Array.from(source.matchAll(IMPORT_RE))
    .filter((match) => !match[1]) // `import type` is erased at build time
    .map((match) => match[2] ?? match[3]);
}

/** Server-only imports reachable from `entry`, as readable chains. */
function serverOnlyChains(entry: string, { allowBrowserStubs }: { allowBrowserStubs: boolean }): string[] {
  const parent = new Map<string, string | null>([[entry, null]]);
  const queue = [entry];
  const chains: string[] = [];
  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (allowBrowserStubs && BROWSER_STUBBED.has(file)) {
      continue;
    }
    for (const spec of runtimeImports(file)) {
      if (spec.startsWith('.')) {
        const resolved = resolveRelative(file, spec);
        if (resolved && !parent.has(resolved)) {
          parent.set(resolved, file);
          queue.push(resolved);
        }
      } else if (SERVER_ONLY.test(spec)) {
        const chain = [spec];
        for (let current: string | null | undefined = file; current; current = parent.get(current)) {
          chain.unshift(path.relative(SRC, current));
        }
        chains.push(chain.join(' -> '));
      }
    }
  }
  return chains;
}

function useClientFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return useClientFiles(full);
    }
    return /\.tsx?$/.test(entry.name) && /^['"]use client['"]/.test(fs.readFileSync(full, 'utf8')) ? [full] : [];
  });
}

describe('client bundle boundary', () => {
  const clientFiles = useClientFiles(SRC);

  it('finds the SDK client components to check', () => {
    expect(clientFiles.length).toBeGreaterThan(5);
  });

  it.each(clientFiles.map((file) => [path.relative(SRC, file), file]))(
    "'use client' module %s does not import server-only packages",
    (_name, file) => {
      expect(serverOnlyChains(file, { allowBrowserStubs: false })).toEqual([]);
    }
  );

  it.each(['index.ts', 'no-ssr/index.ts', 'pages/index.ts'])(
    'the %s entry reaches server-only packages only through browser-stubbed modules',
    (entry) => {
      expect(serverOnlyChains(path.join(SRC, entry), { allowBrowserStubs: true })).toEqual([]);
    }
  );

  it('every browser-stubbed module has a browser build beside it', () => {
    BROWSER_STUBBED.forEach((file) => {
      expect(fs.existsSync(file.replace(/index\.ts$/, 'index.browser.ts'))).toBe(true);
    });
  });
});
