import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@frontegg/nextjs/edge';

export const middleware = async (request: NextRequest) => {
  const session = await getSession(request);
  const isAuthRoute = request.url.endsWith('/') || request.url.endsWith('/session');

  if (!session && isAuthRoute) {
    // redirect unauthenticated user to /account/login page
    return NextResponse.redirect(new URL('/account/login', request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: '/(.*)',
};
