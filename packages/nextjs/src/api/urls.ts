import ConfigManager from '../ConfigManager';

export const ApiUrls = {
  WellKnown: {
    jwks: `${ConfigManager.baseUrl}/.well-known/jwks.json`,
  },
};
