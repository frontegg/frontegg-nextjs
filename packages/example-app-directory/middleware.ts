import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionOnEdge, shouldByPassMiddleware } from '@frontegg/nextjs/edge';

export const middleware = async (request: NextRequest) => {
  // this if for frontegg middleware tests
  if (process.env['FRONTEGG_TEST_URL']) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  //
  if (
    shouldByPassMiddleware(pathname, {
      bypassImageOptimization: false,
    })
  ) {
    return NextResponse.next();
  }
  //
  const session = await getSessionOnEdge(request);
  if (!session) {
    //  redirect unauthenticated user to /account/login page
    const loginUrl = `/account/login?redirectUrl=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(new URL(loginUrl, process.env['FRONTEGG_APP_URL']));
  }

  return NextResponse.next();
};

export const config = {
  matcher: '/(.*)',
};
