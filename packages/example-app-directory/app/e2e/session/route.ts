import { getAppUserSession, getAppUserTokens } from '@frontegg/nextjs/app';
import { NextResponse } from 'next/server';
import { probeNotFound, probesEnabled } from '../probes';

export const dynamic = 'force-dynamic';

// E2E probe: what the SDK's App Router helpers resolve for this request (no token values).
export async function GET() {
  if (!probesEnabled()) {
    return probeNotFound();
  }
  const [user, tokens] = await Promise.all([getAppUserSession(), getAppUserTokens()]);
  return NextResponse.json({
    authenticated: !!user,
    user: user ? { sub: user.sub, email: user.email } : null,
    hasAccessToken: !!tokens?.accessToken,
    hasRefreshToken: !!tokens?.refreshToken,
  });
}
