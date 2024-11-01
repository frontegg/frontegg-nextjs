import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  isHostedLoginCallback,
  handleHostedLoginCallback,
  getSessionOnEdge,
  shouldByPassMiddleware,
  redirectToLogin,
} from '@frontegg/nextjs/edge';

export const middleware = async (request: NextRequest) => {
  // this if for frontegg middleware tests
  if (process.env['FRONTEGG_TEST_URL']) {
    return NextResponse.next();
  }

  const { pathname, searchParams } = request.nextUrl;

  if (isHostedLoginCallback(pathname, searchParams)) {
    return handleHostedLoginCallback(request, pathname, searchParams);
  }

  if (shouldByPassMiddleware(pathname /*, options: optional bypass configuration */)) {
    return NextResponse.next();
  }

  const session = await getSessionOnEdge(request);
  const response = NextResponse.next();

  if (!session) {
    return redirectToLogin(pathname, searchParams);
  }
  return NextResponse.next();
};

export const config = {
  matcher: '/(.*)',
};
