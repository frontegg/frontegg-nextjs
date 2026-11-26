import type { ParsedUrlQuery } from 'querystring';

// Client-safe helpers only: this module is imported by 'use client' components.
// Server-only session helpers live in utils/sessionTokens.

export const getAfterAuthRedirectUrl = (queryParams: ParsedUrlQuery) => {
  const redirectPath = queryParams.redirectUrl;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(queryParams)) {
    if (key !== 'redirectUrl' && value !== undefined) {
      query.append(key, String(value));
    }
  }

  const redirectUrl = query.toString() ? `${redirectPath}?${query.toString()}` : redirectPath;

  return `${window.location.origin}${redirectUrl}`;
};
