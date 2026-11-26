import type { EncryptionUtils, FronteggUserTokens } from '../../types';

/**
 * Browser build of utils/encryption, selected through the `browser` field that
 * scripts/copy-files.js writes into this folder's package.json.
 *
 * Session cookies are sealed and unsealed on the server only. Code that may be bundled for
 * the browser (for example withFronteggApp's getInitialProps) still imports this module, so
 * the browser gets this stub instead of iron-session, whose crypto dependency imports
 * `node:crypto` and breaks client bundles.
 */
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
