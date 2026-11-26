import type { APIRequestContext, BrowserContext, Cookie } from '@playwright/test';
import { FLOWS } from './env';

export interface MockRequest {
  method: string;
  path: string;
  query: string;
  headers: Record<string, string>;
  body: string;
}

export interface MockConfig {
  failRefresh?: boolean;
  refreshFailureStatus?: number;
  accessTokenTtlSeconds?: number;
  claimsPaddingLength?: number;
}

export const REFRESH_PATH = '/frontegg/identity/resources/auth/v1/user/token/refresh';
export const OAUTH_TOKEN_PATH = '/frontegg/oauth/token';
export const JWKS_PATH = '/.well-known/jwks.json';

export const refreshCookieName = () => `fe_refresh_${FLOWS.clientId.replace(/-/g, '')}`;
export const sessionCookieBaseName = () => `fe_session-${FLOWS.clientId.replace(/-/g, '')}`;

/** Thin client for the mock backend's /__mock control API. */
export class MockBackend {
  constructor(private readonly request: APIRequestContext) {}

  async reset(): Promise<void> {
    await this.request.post(`${FLOWS.mockBaseUrl}/__mock/reset`);
  }

  async configure(config: MockConfig): Promise<void> {
    await this.request.post(`${FLOWS.mockBaseUrl}/__mock/config`, { data: config });
  }

  async requests(path?: string): Promise<MockRequest[]> {
    const response = await this.request.get(`${FLOWS.mockBaseUrl}/__mock/requests`);
    const all: MockRequest[] = await response.json();
    return path ? all.filter((r) => r.path === path) : all;
  }
}

export function refreshCookie(value: string, url: string): Cookie {
  return {
    name: refreshCookieName(),
    value,
    domain: new URL(url).hostname,
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    expires: -1,
  };
}

/** Session cookies currently in the browser, in chunk order, joined. */
export async function sessionCookies(context: BrowserContext): Promise<Cookie[]> {
  const base = sessionCookieBaseName();
  return (await context.cookies()).filter((c) => c.name === base || c.name.startsWith(`${base}-`));
}
