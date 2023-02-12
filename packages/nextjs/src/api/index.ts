import config from '../config';
import { ApiUrls } from './urls';

const loadPublicKey = async () => {
  const response = await fetch(`${config.baseUrl}${ApiUrls.WellKnown.jwks}`);
  const data = await response.json();
  return data.keys[0];
};

export default {
  loadPublicKey,
};
