import { InvalidFronteggEnv, FronteggEnvNotFound } from '../../errors';
import { PasswordsMap, FronteggEnvVariables } from './types';
import { EnvVariables } from './constants';

/**
 * Return environment variable's value.
 * @throws {@link FronteggEnvNotFound} if not exists
 * @param name
 */
export const getEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new FronteggEnvNotFound(name);
  }
  return value;
};

/**
 * Return environment variable's value with default if not exists
 * @param {string} name - the name from environment variable {@link EnvVariables}
 * @param {optional string} defaultValue - default value if not exists
 */
export const getEnvOrDefault = (name: string, defaultValue?: string | undefined): string | undefined => {
  try {
    return getEnv(name);
  } catch (e) {
    return defaultValue;
  }
};

/**
 * extract hostname from appUrl for session cookie creation
 * @param {string} appUrl - The generated appUrl
 */
export const generateCookieDomain = (appUrl: string): string => {
  try {
    const url = new URL(appUrl);
    return url.hostname.replace(/:(\d)+$/, '');
  } catch (e) {
    throw new InvalidFronteggEnv(EnvVariables.FRONTEGG_APP_URL, 'Valid URL');
  }
};

/**
 * Create passwordMap if from {@link EnvVariables.FRONTEGG_ENCRYPTION_PASSWORD}
 * @param {string} password - encryption password
 */
export function normalizeStringPasswordToMap(password: string | PasswordsMap): PasswordsMap {
  return typeof password === 'string' ? { 1: password } : password;
}

/**
 * Check if the Next.js application running on Vercel Deployment Service
 * and calculate the appUrl based on Vercel Environment variables.
 */
export function generateAppUrl() {
  const appUrlEnv = getEnvOrDefault(EnvVariables.FRONTEGG_APP_URL);
  const isVercel = getEnvOrDefault(EnvVariables.VERCEL) != null;
  const vercelUrl = getEnvOrDefault(EnvVariables.VERCEL_URL);

  let appUrl: string | undefined;
  if (appUrlEnv) {
    appUrl = appUrlEnv;
  } else if (isVercel && vercelUrl) {
    appUrl = vercelUrl;
  }

  if (!appUrl) {
    if (isVercel) {
      throw new FronteggEnvNotFound(EnvVariables.VERCEL, EnvVariables.VERCEL_URL);
    } else {
      throw new FronteggEnvNotFound(EnvVariables.FRONTEGG_APP_URL);
    }
  }

  /**
   * In some cases the {@link EnvVariables.VERCEL_URL} value does not
   * include the URL protocol, bellow code to verify that the appUrl
   * must have a valid http protocl
   */
  if (!appUrl.startsWith('http')) {
    const protocol = appUrl.startsWith('localhost') ? 'http://' : 'https://';
    appUrl = `${protocol}${appUrl}`;
  }

  return appUrl;
}

export const getEnvVariables = (): FronteggEnvVariables => {
  const baseUrl = getEnv(EnvVariables.FRONTEGG_BASE_URL);
  const testUrl = getEnvOrDefault(EnvVariables.FRONTEGG_TEST_URL);
  const clientId = getEnv(EnvVariables.FRONTEGG_CLIENT_ID);
  const encryptionPasswordEnv = getEnv(EnvVariables.FRONTEGG_ENCRYPTION_PASSWORD);
  const cookieName = getEnv(EnvVariables.FRONTEGG_COOKIE_NAME);

  const appUrl = generateAppUrl();
  const cookieDomain = generateCookieDomain(appUrl);
  const encryptionPassword = normalizeStringPasswordToMap(encryptionPasswordEnv);

  return {
    appUrl,
    testUrl,
    baseUrl,
    clientId,
    encryptionPassword,
    cookieName,
    cookieDomain,
  };
};
