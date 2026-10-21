// Copied from https://www.cloudflare.com/ips/, update this list when Cloudflare publishes new ranges
const CLOUDFLARE_RANGES = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
];

interface ParsedIp {
  bitsPerPart: number;
  parts: number[];
}

interface IpRange {
  network: ParsedIp;
  prefixLength: number;
}

const IPV4_WITH_PORT = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/;
const BRACKETED_IPV6 = /^\[([^\]]+)\](?::\d+)?$/;
const IPV4_MAPPED_PREFIX = /^::ffff:(?=\d{1,3}(?:\.\d{1,3}){3}$)/;
const IPV4_OCTET = /^(?:0|[1-9]\d{0,2})$/;
const IPV4_MAPPED_HEXTETS = [0, 0, 0, 0, 0, 0xffff];

function parseIpv4(ip: string): ParsedIp | undefined {
  const octets = ip.split('.');
  const isValid = octets.length === 4 && octets.every((octet) => IPV4_OCTET.test(octet) && Number(octet) <= 255);
  return isValid ? { bitsPerPart: 8, parts: octets.map(Number) } : undefined;
}

function parseIpv6(ip: string): ParsedIp | undefined {
  const sections = ip.split('::');
  if (sections.length > 2) {
    return undefined;
  }
  const head = sections[0] ? sections[0].split(':') : [];
  const tail = sections[1] ? sections[1].split(':') : [];
  const zeroHextets = sections.length === 2 ? 8 - head.length - tail.length : 0;
  const hextets = [...head, ...Array(Math.max(zeroHextets, 0)).fill('0'), ...tail];
  const isValid = hextets.length === 8 && hextets.every((hextet) => /^[0-9a-f]{1,4}$/i.test(hextet));
  return isValid ? { bitsPerPart: 16, parts: hextets.map((hextet) => parseInt(hextet, 16)) } : undefined;
}

function parseIp(ip: string): ParsedIp | undefined {
  return ip.includes(':') ? parseIpv6(ip) : parseIpv4(ip);
}

function parseRange(cidr: string): IpRange {
  const [rangeAddress, prefixLength] = cidr.split('/');
  return { network: parseIp(rangeAddress)!, prefixLength: Number(prefixLength) };
}

function isInRange(address: ParsedIp, range: IpRange): boolean {
  if (address.bitsPerPart !== range.network.bitsPerPart) {
    return false;
  }
  let remainingBits = range.prefixLength;
  for (let index = 0; index < address.parts.length && remainingBits > 0; index++) {
    const comparedBits = Math.min(address.bitsPerPart, remainingBits);
    const mask = ((1 << comparedBits) - 1) << (address.bitsPerPart - comparedBits);
    if ((address.parts[index] & mask) !== (range.network.parts[index] & mask)) {
      return false;
    }
    remainingBits -= comparedBits;
  }
  return true;
}

const PARSED_CLOUDFLARE_RANGES = CLOUDFLARE_RANGES.map(parseRange);

function toIpv4IfMapped(address: ParsedIp): ParsedIp {
  const isMapped =
    address.bitsPerPart === 16 && IPV4_MAPPED_HEXTETS.every((hextet, index) => address.parts[index] === hextet);
  if (!isMapped) {
    return address;
  }
  const [highHextet, lowHextet] = address.parts.slice(6);
  return { bitsPerPart: 8, parts: [highHextet >> 8, highHextet & 0xff, lowHextet >> 8, lowHextet & 0xff] };
}

function formatIpv6(hextets: number[]): string {
  let longestZeroRunStart = -1;
  let longestZeroRunLength = 1;
  for (let runStart = 0; runStart < hextets.length; runStart++) {
    let runLength = 0;
    while (hextets[runStart + runLength] === 0) {
      runLength++;
    }
    if (runLength > longestZeroRunLength) {
      longestZeroRunStart = runStart;
      longestZeroRunLength = runLength;
    }
  }
  const hexParts = hextets.map((hextet) => hextet.toString(16));
  if (longestZeroRunStart === -1) {
    return hexParts.join(':');
  }
  const head = hexParts.slice(0, longestZeroRunStart).join(':');
  const tail = hexParts.slice(longestZeroRunStart + longestZeroRunLength).join(':');
  return `${head}::${tail}`;
}

/** Returns the canonical form of an IP address (no port or brackets, IPv4-mapped IPv6 as IPv4), or undefined for anything else. */
export function normalizeIp(rawIp: unknown): string | undefined {
  if (typeof rawIp !== 'string') {
    return undefined;
  }
  const trimmedIp = rawIp.trim().toLowerCase();
  const addressWithoutPort = trimmedIp.match(BRACKETED_IPV6)?.[1] ?? trimmedIp.match(IPV4_WITH_PORT)?.[1] ?? trimmedIp;
  const parsedIp = parseIp(addressWithoutPort.replace(IPV4_MAPPED_PREFIX, ''));
  if (!parsedIp) {
    return undefined;
  }
  const address = toIpv4IfMapped(parsedIp);
  if (address.parts.every((part) => part === 0)) {
    return undefined;
  }
  return address.bitsPerPart === 8 ? address.parts.join('.') : formatIpv6(address.parts);
}

export function isCloudflareIp(ip: string): boolean {
  const address = parseIp(ip);
  return !!address && PARSED_CLOUDFLARE_RANGES.some((range) => isInRange(address, range));
}
