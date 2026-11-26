import { vi } from 'vitest';
import { EnvVariables } from '../../../src/config/constants';

/** A valid 64-char hex encryption password (32 random bytes as hex). */
export const VALID_PASSWORD = '0123456789abcdef'.repeat(4);

type EnvMap = Partial<Record<EnvVariables | string, string>>;

const MANAGED_ENV_NAMES: string[] = [...Object.values(EnvVariables)];

let snapshot: Record<string, string | undefined> = {};

/** Remove every Frontegg / Vercel env variable and remember the previous values. */
export const clearFronteggEnv = () => {
  snapshot = Object.fromEntries(MANAGED_ENV_NAMES.map((name) => [name, process.env[name]]));
  MANAGED_ENV_NAMES.forEach((name) => delete process.env[name]);
};

/** Restore the env variables captured by {@link clearFronteggEnv}. */
export const restoreFronteggEnv = () => {
  MANAGED_ENV_NAMES.forEach((name) => {
    const previous = snapshot[name];
    if (previous === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previous;
    }
  });
};

export const setEnv = (vars: EnvMap) => {
  Object.entries(vars).forEach(([name, value]) => {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  });
};

export const unsetEnv = (...names: string[]) => names.forEach((name) => delete process.env[name]);

/**
 * Re-evaluate `src/config` so that its module-level `setupEnvVariables` snapshot
 * and the `new Config()` constructor run against the current `process.env`.
 */
export const loadConfig = async () => {
  vi.resetModules();
  const mod = await import('../../../src/config');
  return mod.default;
};

export const loadHelpers = async () => {
  vi.resetModules();
  return import('../../../src/config/helpers');
};
