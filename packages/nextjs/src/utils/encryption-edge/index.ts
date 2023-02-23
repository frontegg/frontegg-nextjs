// noinspection DuplicatedCode
// duplicated code for standard iron-session and iron-session/edge

import config from '../../config';
import { unsealData, sealData } from 'iron-session/edge';
import type { FronteggUserTokens, EncryptionUtils } from '../../types';

/**
 * IMPORTANT NOTE:
 * This utils can be used only in edge runtime, for server/client runtime use the ./utils/encryption
 **/

const unsealTokens = async (cookie: string): Promise<FronteggUserTokens | undefined> => {
  const jwtData: string = await unsealData(cookie, {
    password: config.password,
  });
  return JSON.parse(jwtData);
};

const sealTokens = async (tokens: FronteggUserTokens, ttl: number): Promise<string> => {
  const dataToSeal = JSON.stringify(tokens);
  return sealData(dataToSeal, {
    password: config.password,
    ttl,
  });
};

const encryptionUtils: EncryptionUtils = {
  unsealTokens,
  sealTokens,
};

export default encryptionUtils;
