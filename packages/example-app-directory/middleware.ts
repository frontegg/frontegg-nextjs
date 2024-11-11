import { NextRequest, NextResponse } from 'next/server';
import { handleSessionOnEdge } from '@frontegg/nextjs/edge';

export const middleware = async (request: NextRequest) => {
  // this if for frontegg middleware tests
  if (process.env['FRONTEGG_TEST_URL']) {
    return NextResponse.next();
  }

  const { pathname, searchParams } = request.nextUrl;
  const headers = request.headers;

  // Additional logic if needed

  return handleSessionOnEdge({ request, pathname, searchParams, headers });
};

export const config = {
  matcher: '/(.*)',
};
