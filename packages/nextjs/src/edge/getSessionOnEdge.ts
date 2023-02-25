import type { IncomingMessage } from 'http';
import { FronteggNextJSSession } from '../types';
import CookieManager from '../utils/cookies';
import createSession from '../utils/createSession';
import encryptionEdge from '../utils/encryption-edge';

export const getSessionOnEdge = (req: IncomingMessage | Request): Promise<FronteggNextJSSession | undefined> => {
  const cookies = CookieManager.getSessionCookieFromRequest(req);
  return createSession(cookies, encryptionEdge);
};
