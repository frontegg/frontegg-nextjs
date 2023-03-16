import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionOnEdge, shouldByPassMiddleware, redirectToLogin } from '@frontegg/nextjs/edge';

export const middleware = async (request: NextRequest) => {
  // this if for frontegg middleware tests
  if (process.env['FRONTEGG_TEST_URL']) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  if (shouldByPassMiddleware(pathname /*, options: optional bypass configuration */)) {
    return NextResponse.next();
  }

  const session = await getSessionOnEdge(request);
  if (!session) {
    return redirectToLogin(pathname);
  }
  return NextResponse.next();
};

export const config = {
  matcher: '/(.*)',
};
