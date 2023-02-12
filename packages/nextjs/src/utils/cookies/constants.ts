/**
 * Maximum cookie value length, used to split encrypted session cookie
 * in order to store large jwt as array of cookies
 *
 * The MAX header length is 4092 we picked 4000 as MAX CookieHeader length
 */
export const COOKIE_MAX_LENGTH = 4000;
