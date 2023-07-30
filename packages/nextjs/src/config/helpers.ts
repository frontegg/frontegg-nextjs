import { InvalidFronteggEnv, FronteggEnvNotFound } from '../utils/errors';
import { PasswordsMap } from './types';
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
 * Set environment variable app url value.
 * @param value
 */
export const setEnvAppUrl = (value: string) => {
  process.env[EnvVariables.FRONTEGG_APP_URL] = value;
};

/**
 * Return environment variable's value with default if not exists
 * @param {string} name - the name from environment variable {@link EnvVariables}
 * @param {optional string} defaultValue - default value if not exists
 */
export const getEnvOrDefault = <T>(name: string, defaultValue: T): string | T => {
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
  const appUrlEnv = getEnvOrDefault(EnvVariables.FRONTEGG_APP_URL, undefined);
  const isVercel = getEnvOrDefault(EnvVariables.VERCEL, undefined) != undefined;
  const vercelUrl = getEnvOrDefault(EnvVariables.VERCEL_URL, undefined);

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
   * must have a valid http protocol
   */
  if (!appUrl.startsWith('http')) {
    // noinspection HttpUrlsUsage
    const protocol = appUrl.startsWith('localhost') ? 'http://' : 'https://';
    appUrl = `${protocol}${appUrl}`;
  }

  return appUrl;
}
