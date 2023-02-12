import { IncomingMessage, ServerResponse } from 'http';
import { CookieSerializeOptions } from 'cookie';

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
