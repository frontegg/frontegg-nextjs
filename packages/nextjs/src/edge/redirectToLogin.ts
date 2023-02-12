import { NextResponse } from 'next/server';

export const redirectToLogin = (pathname: string) => {
  const loginUrl = `/account/login?redirectUrl=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(new URL(loginUrl, process.env['FRONTEGG_APP_URL']));
};
