import { getAppUserSession, getAppUserTokens } from '@frontegg/nextjs/app';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * E2E probe: returns what the SDK's App Router helpers resolve for this request on the server.
 * Used by packages/nextjs/tests/e2e/flows.
 */
export async function GET() {
  const [user, tokens] = await Promise.all([getAppUserSession(), getAppUserTokens()]);
  return NextResponse.json({
    authenticated: !!user,
    user: user ? { sub: user.sub, email: user.email } : null,
    hasAccessToken: !!tokens?.accessToken,
    refreshToken: tokens?.refreshToken ?? null,
  });
}
