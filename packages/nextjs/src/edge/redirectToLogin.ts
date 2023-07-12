import { NextResponse } from 'next/server';
import { buildLoginRoute } from '../api/urls';

export const redirectToLogin = (pathname: string, searchParams?: URLSearchParams, baseUrl?: string) => {
  const { asUrl: loginUrl } = buildLoginRoute(pathname, searchParams, baseUrl);
  return NextResponse.redirect(loginUrl);
};
