/**
 * Extracts the real client IP address from a raw IP string or array.
 *
 * If the input contains multiple IPs (e.g., from the `x-forwarded-for` header),
 * it returns only the first IP, which typically represents the real client.
 *
 * @param rawIp - A single IP string or an array of IPs.
 * @returns The first IP address as a string, or undefined if not available.
 */
export function getClientIp(rawIp?: string | string[]): string | undefined {
  if (!rawIp) return undefined;
  const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp;
  return ip.split(',')[0].trim();
}
