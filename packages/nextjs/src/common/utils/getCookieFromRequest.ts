import { RequestType } from '../types';
import parseCookie from './parseCookie';

export default function getCookieFromRequest(req?: RequestType): string | undefined {
  if (!req) {
    return undefined;
  }
  const cookieStr = 'credentials' in req ? req.headers.get('cookie') || '' : req.headers.cookie || '';
  return parseCookie(cookieStr);
}
