import { NextResponse } from 'next/server';
import { buildLoginRoute } from '../api/urls';

/**
 * Redirect to login page in edge environment (middleware file) using NextResponse.redirect.
 *
 *  @param {string} pathname - The URL path to redirect to after successful login.
 *  @param {URLSearchParams} searchParams - optional The URL search Params to preserve to login
 *  @param {string} baseUrl - optional The login base URL the user will be redirected to (default .env.local FRONTEGG_APP_URL)
 *
 *  @returns {NextResponse} redirects to login page
 *
 */

//consider refactor params to object on next major version
export const redirectToLogin = (pathname: string, searchParams?: URLSearchParams, baseUrl?: string) => {
  const { asUrl: loginUrl } = buildLoginRoute(pathname, searchParams, baseUrl);
  return NextResponse.redirect(loginUrl);
};
