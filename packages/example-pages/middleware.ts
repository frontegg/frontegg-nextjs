import { NextRequest } from 'next/server';
import { handleSessionOnEdge } from '@frontegg/nextjs/edge';

export const middleware = async (request: NextRequest) => {
  const { pathname, searchParams } = request.nextUrl;
  const headers = request.headers;

  // Additional logic if needed

  return handleSessionOnEdge({ request, pathname, searchParams, headers });
};

export const config = {
  matcher: '/(.*)',
};
