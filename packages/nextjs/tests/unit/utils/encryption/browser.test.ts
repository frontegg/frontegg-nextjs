import { describe, it, expect } from 'vitest';
import browserEncryption from '../../../../src/utils/encryption/index.browser';
import serverEncryption from '../../../../src/utils/encryption';

describe('browser build of utils/encryption', () => {
  it('exposes the same functions as the server build', () => {
    expect(Object.keys(browserEncryption).sort()).toEqual(Object.keys(serverEncryption).sort());
  });

  it('refuses to unseal a session cookie in the browser', async () => {
    await expect(browserEncryption.unsealTokens('sealed')).rejects.toThrow(
      'session cookies can only be sealed or unsealed on the server'
    );
  });

  it('refuses to seal a session cookie in the browser', async () => {
    await expect(browserEncryption.sealTokens({ accessToken: 'a', refreshToken: 'r' }, 60)).rejects.toThrow(
      'session cookies can only be sealed or unsealed on the server'
    );
  });
});
