import { NextResponse } from 'next/server';

// Test-only routes for packages/nextjs/tests/e2e/flows; they 404 unless the E2E config sets FRONTEGG_E2E_PROBES=1.
export const probesEnabled = (): boolean => process.env.FRONTEGG_E2E_PROBES === '1';

export const probeNotFound = (): NextResponse => new NextResponse(null, { status: 404 });
