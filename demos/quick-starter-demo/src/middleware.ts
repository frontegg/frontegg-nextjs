import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionOnEdge, shouldByPassMiddleware, redirectToLogin } from '@frontegg/nextjs/edge';

// Use edge middleware to protect your routes with Frontegg authentication
export const middleware = async (request: NextRequest) => {
  const { pathname, searchParams, origin } = request.nextUrl;

  if (shouldByPassMiddleware(pathname /*, options: optional bypass configuration */)) {
    return NextResponse.next();
  }

  const session = await getSessionOnEdge(request);

  if (!session) {
    return redirectToLogin(pathname, searchParams, origin);
  }
  return NextResponse.next();
};

export const config = {
  matcher: '/(.*)',
};
