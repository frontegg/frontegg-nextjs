import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { probeNotFound, probesEnabled } from '../probes';

export const dynamic = 'force-dynamic';

// E2E probe: the cookies the app's server code received after the SDK middleware ran.
export function GET() {
  if (!probesEnabled()) {
    return probeNotFound();
  }
  const receivedCookies = cookies()
    .getAll()
    .map(({ name, value }) => ({ name, value }));
  return NextResponse.json(receivedCookies);
}
