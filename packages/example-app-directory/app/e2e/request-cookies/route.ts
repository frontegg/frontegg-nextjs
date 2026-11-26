import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * E2E probe: returns the cookies the app's server code received, after the SDK middleware ran.
 * Used by packages/nextjs/tests/e2e/flows to check cookies forwarded after a token refresh.
 */
export function GET() {
  const receivedCookies = cookies()
    .getAll()
    .map(({ name, value }) => ({ name, value }));
  return NextResponse.json(receivedCookies);
}
