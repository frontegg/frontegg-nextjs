// 400/401 mean the refresh token itself was rejected; anything else (5xx, 429, no response) is transient.
const REJECTED_REFRESH_STATUSES = [400, 401];

export const isRefreshRejected = (response: Response | null): boolean =>
  response !== null && REJECTED_REFRESH_STATUSES.includes(response.status);
