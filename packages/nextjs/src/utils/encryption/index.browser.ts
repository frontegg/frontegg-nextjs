import type { EncryptionUtils, FronteggUserTokens } from '../../types';

// Browser build (via the `browser` field from scripts/copy-files.js): keeps iron-session out of client bundles.
const SERVER_ONLY_ERROR =
  '@frontegg/nextjs: session cookies can only be sealed or unsealed on the server, not in the browser.';

const unsealTokens = (_data: string): Promise<FronteggUserTokens | undefined> =>
  Promise.reject(new Error(SERVER_ONLY_ERROR));

const sealTokens = (_tokens: FronteggUserTokens, _ttl: number): Promise<string> =>
  Promise.reject(new Error(SERVER_ONLY_ERROR));

const encryptionUtils: EncryptionUtils = {
  unsealTokens,
  sealTokens,
};

export default encryptionUtils;
