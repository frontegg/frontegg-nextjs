import { NextResponse } from 'next/server';
import { buildLoginRoute } from '../api/urls';

export const redirectToLogin = (pathname: string, searchParams?: URLSearchParams) => {
  const { asUrl: loginUrl } = buildLoginRoute(pathname, searchParams);
  return NextResponse.redirect(loginUrl);
};
