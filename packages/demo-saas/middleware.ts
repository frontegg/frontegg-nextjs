import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@frontegg/nextjs/edge';

export const middleware = async (request: NextRequest) => {
  const session = await getSession(request);

  console.log('middleware session', session);

  if (!session) {
    // redirect unauthenticated user to /account/login page
    return NextResponse.redirect(new URL('/account/login', request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: '/(.*)',
};
