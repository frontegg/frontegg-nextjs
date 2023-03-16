import { NextResponse } from 'next/server';
import { buildLoginRoute } from '../api/urls';

export const redirectToLogin = (pathname: string) => {
  const { asUrl: loginUrl } = buildLoginRoute(pathname);
  return NextResponse.redirect(loginUrl);
};
