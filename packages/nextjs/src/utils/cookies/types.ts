import { IncomingMessage, ServerResponse } from 'http';

export type RequestType = IncomingMessage | Request;
export type ResponseType = ServerResponse;

export interface CreateCookieOptions extends Pick<CookieSerializeOptions, 'domain' | 'httpOnly' | 'path'> {
  cookieName?: string;
  value: string;
  secure: boolean;
  expires: Date;
  silent?: boolean;
}

export interface RemoveCookiesOptions {
  cookieNames?: string[];
  isSecured: boolean;
  cookieDomain: string;
  res: ResponseType;
  req?: RequestType;
}

/**
 * Cookie serialization options
 */
export interface CookieSerializeOptions {
  domain?: string | undefined;
  expires?: Date | undefined;
  httpOnly?: boolean | undefined;
  maxAge?: number | undefined;
  path?: string | undefined;
  priority?: 'low' | 'medium' | 'high' | undefined;
  sameSite?: true | false | 'lax' | 'strict' | 'none' | undefined;
  secure?: boolean | undefined;
}
