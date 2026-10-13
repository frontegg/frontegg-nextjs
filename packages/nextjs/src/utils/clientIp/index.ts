// Published at https://www.cloudflare.com/ips/
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

const PRIVATE_RANGES = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '100.64.0.0/10',
  '::1/128',
  'fc00::/7',
  'fe80::/10',
];

interface ParsedIp {
  bitsPerPart: number;
  parts: number[];
}

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
  const ipv4MappedPrefix = '::ffff:';
  const address = ip.toLowerCase().startsWith(ipv4MappedPrefix) && ip.includes('.') ? ip.slice(7) : ip;
  return address.includes(':') ? parseIpv6(address) : parseIpv4(address);
}

function isInRange(ip: string, cidr: string): boolean {
  const [rangeAddress, prefixLength] = cidr.split('/');
  const address = parseIp(ip);
  const range = parseIp(rangeAddress);
  if (!address || !range || address.bitsPerPart !== range.bitsPerPart) {
    return false;
  }
  let remainingBits = Number(prefixLength);
  for (let index = 0; index < address.parts.length && remainingBits > 0; index++) {
    const comparedBits = Math.min(address.bitsPerPart, remainingBits);
    const mask = ((1 << comparedBits) - 1) << (address.bitsPerPart - comparedBits);
    if ((address.parts[index] & mask) !== (range.parts[index] & mask)) {
      return false;
    }
    remainingBits -= comparedBits;
  }
  return true;
}

export const isPrivateIp = (ip: string): boolean => PRIVATE_RANGES.some((cidr) => isInRange(ip, cidr));

export const isCloudflareIp = (ip: string): boolean => CLOUDFLARE_RANGES.some((cidr) => isInRange(ip, cidr));
