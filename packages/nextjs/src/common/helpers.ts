import type { ParsedUrlQuery } from 'querystring';

// Client-safe only ('use client' components import this); server session helpers live in utils/sessionTokens.

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
