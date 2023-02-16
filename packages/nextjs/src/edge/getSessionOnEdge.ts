import CookieManager from '../utils/cookies';
import createSession from '../utils/createSession';
import { FronteggNextJSSession } from '../types';
import encryptionEdge from '../utils/encryption-edge';
import { IncomingMessage } from 'http';

export const getSession = (req: IncomingMessage | Request): Promise<FronteggNextJSSession | undefined> => {
  const cookies = CookieManager.getSessionCookieFromRequest(req);
  debugger;
  return createSession(cookies, encryptionEdge);
};
