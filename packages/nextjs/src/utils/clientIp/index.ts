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

function parseIpv4(ip: string): ParsedIp | undefined {
  const octets = ip.split('.');
  const isValid = octets.length === 4 && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255);
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

/** Strips a port, brackets and the IPv4-mapped prefix, and returns undefined for anything that is not an IP address. */
export function normalizeIp(rawIp?: string): string | undefined {
  const trimmedIp = rawIp?.trim().toLowerCase() ?? '';
  const addressWithoutPort = trimmedIp.match(BRACKETED_IPV6)?.[1] ?? trimmedIp.match(IPV4_WITH_PORT)?.[1] ?? trimmedIp;
  const address = addressWithoutPort.replace(IPV4_MAPPED_PREFIX, '');
  return parseIp(address) ? address : undefined;
}

export function isCloudflareIp(ip: string): boolean {
  const address = parseIp(ip);
  return !!address && PARSED_CLOUDFLARE_RANGES.some((range) => isInRange(address, range));
}
