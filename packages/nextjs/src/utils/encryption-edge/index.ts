// noinspection DuplicatedCode
// duplicated code for standard iron-session and iron-session/edge

import { unsealData, sealData } from 'iron-session/edge';
import { FronteggUserTokens } from '../../common';
import config from '../../config';

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

export default {
  unsealTokens,
  sealTokens,
};
