// The server-side request guard for link previews. A pasted URL may point anywhere, so before every request (and every
// redirect hop) the URL is checked, its host is resolved, every address it resolves to is checked, and the connection
// is pinned to one checked address so a second DNS answer can't swap in a private one.
//
// This file has no runtime imports, so it loads on edge runtimes too.
import type { LookupFunction as NetLookupFunction } from 'node:net';

/** Why a link preview failed. */
export type LinkPreviewErrorCode =
  'invalid_url' | 'blocked' | 'timeout' | 'too_many_redirects' | 'not_html' | 'http_error' | 'unavailable';

/** The error every link preview step throws. `status` is the HTTP status for `http_error`. */
export class LinkPreviewError extends Error {
  /** What went wrong, for the app to map to its own message. */
  readonly code: LinkPreviewErrorCode;
  /** The HTTP status of the response, when there was one. */
  readonly status?: number;

  /**
   * @param code - What went wrong.
   * @param message - An English description for logs.
   * @param status - The HTTP status, when there was a response.
   */
  constructor(code: LinkPreviewErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'LinkPreviewError';
    this.code = code;
    if (status !== undefined) this.status = status;
  }
}

/** One resolved address. */
export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

/**
 * Resolves a host name to every address it has. Compatible with `dns.promises.lookup(hostname, { all: true })` from
 * `node:dns`; inject your own on runtimes without it.
 */
export type LookupFunction = (
  hostname: string,
  options: { all: true },
) => Promise<{ address: string; family: number }[]>;

/** Options for {@link checkUrl}. */
export interface CheckUrlOptions {
  /** Ports a URL may name. A URL without a port counts as 80 for http and 443 for https. Default `[80, 443]`. */
  allowPorts?: readonly number[];
}

// ---------------------------------------------------------------------------------------------------------------------
// IPv4
// ---------------------------------------------------------------------------------------------------------------------

/** Reads one part of an IPv4 host the way a URL parser does: `0x` hex, a leading `0` octal, otherwise decimal. */
function ipv4Part(part: string): number | null {
  if (/^0x[0-9a-f]*$/i.test(part)) return part.length === 2 ? 0 : parseInt(part.slice(2), 16);
  if (/^0[0-7]+$/.test(part)) return parseInt(part.slice(1), 8);
  if (/^(?:0|[1-9]\d*)$/.test(part)) return Number(part);
  return null;
}

/**
 * Reads an IPv4 address in any form a URL host may take and returns it as dotted decimal, or `null` when the host
 * isn't one. Accepts dotted decimal (`127.0.0.1`), a single number (`2130706433`), hex (`0x7f000001`), octal
 * (`0177.0.0.1`), short forms (`127.1`) and a trailing dot.
 */
export function parseIPv4Literal(host: string): string | null {
  let value = host.trim();
  if (value.endsWith('.')) value = value.slice(0, -1);
  if (!value || value.length > 64) return null;
  const parts = value.split('.');
  if (parts.length > 4) return null;
  const numbers: number[] = [];
  for (const part of parts) {
    const number = ipv4Part(part);
    if (number === null || !Number.isFinite(number)) return null;
    numbers.push(number);
  }
  const last = numbers.pop() ?? 0;
  if (numbers.some((number) => number > 255)) return null;
  if (last >= 256 ** (4 - numbers.length)) return null;
  let total = last;
  numbers.forEach((number, index) => {
    total += number * 256 ** (3 - index);
  });
  return [total >>> 24, (total >>> 16) & 255, (total >>> 8) & 255, total & 255].join('.');
}

/** A dotted-decimal IPv4 address as a 32-bit unsigned number. */
function ipv4Number(dotted: string): number {
  return dotted.split('.').reduce((total, part) => total * 256 + Number(part), 0);
}

// [network, prefix length]: every IPv4 range that isn't the public internet.
const blockedIPv4: readonly [string, number][] = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, cloud metadata
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.88.99.0', 24], // 6to4 relay anycast
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, and 255.255.255.255 broadcast
];

const blockedIPv4Ranges = blockedIPv4.map(([network, prefix]) => {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return { base: (ipv4Number(network) & mask) >>> 0, mask };
});

function isBlockedIPv4(dotted: string): boolean {
  const value = ipv4Number(dotted);
  return blockedIPv4Ranges.some(({ base, mask }) => (value & mask) >>> 0 === base);
}

// ---------------------------------------------------------------------------------------------------------------------
// IPv6
// ---------------------------------------------------------------------------------------------------------------------

/** Strict dotted decimal, for the IPv4 tail of an IPv6 address. */
function strictIPv4(value: string): number[] | null {
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const bytes = parts.map((part) => (/^(?:0|[1-9]\d{0,2})$/.test(part) ? Number(part) : 256));
  return bytes.every((byte) => byte <= 255) ? bytes : null;
}

/** Parses an IPv6 address into eight 16-bit groups, or `null`. Zone ids and brackets must be removed first. */
function parseIPv6(input: string): number[] | null {
  let value = input.toLowerCase();
  if (!value || value.length > 64 || !/^[0-9a-f:.]+$/.test(value)) return null;
  // An IPv4 tail becomes two hex groups.
  const tail: number[] = [];
  if (value.includes('.')) {
    const colon = value.lastIndexOf(':');
    const bytes = strictIPv4(value.slice(colon + 1));
    if (colon === -1 || !bytes) return null;
    tail.push(((bytes[0] ?? 0) << 8) | (bytes[1] ?? 0), ((bytes[2] ?? 0) << 8) | (bytes[3] ?? 0));
    value = value.slice(0, colon + 1);
    // "::1.2.3.4" leaves "::", "::ffff:1.2.3.4" leaves "::ffff:", "1:2:3:4:5:6:1.2.3.4" leaves "1:2:3:4:5:6:".
    if (!value.endsWith('::')) value = value.slice(0, -1);
  }
  const halves = value.split('::');
  if (halves.length > 2) return null;
  const readGroups = (text: string | undefined): number[] | null => {
    if (!text) return [];
    const groups: number[] = [];
    for (const group of text.split(':')) {
      if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
      groups.push(parseInt(group, 16));
    }
    return groups;
  };
  const head = readGroups(halves[0]);
  const rest = readGroups(halves[1]);
  if (!head || !rest) return null;
  const known = head.length + rest.length + tail.length;
  if (halves.length === 1) {
    return known === 8 ? [...head, ...tail] : null;
  }
  if (known > 7) return null;
  return [...head, ...new Array<number>(8 - known).fill(0), ...rest, ...tail];
}

function embeddedIPv4(groups: number[], index: number): string {
  const high = groups[index] ?? 0;
  const low = groups[index + 1] ?? 0;
  return [high >> 8, high & 255, low >> 8, low & 255].join('.');
}

function isBlockedIPv6(groups: number[]): boolean {
  const [g0 = 0, g1 = 0, g2 = 0, g3 = 0, g4 = 0, g5 = 0] = groups;
  // ::ffff:a.b.c.d, IPv4-mapped: judge the IPv4 address it stands for.
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff) {
    return isBlockedIPv4(embeddedIPv4(groups, 6));
  }
  // 64:ff9b::/96, the well-known NAT64 prefix: judge the IPv4 address it translates to.
  if (g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return isBlockedIPv4(embeddedIPv4(groups, 6));
  }
  // Only 2000::/3 is global unicast. Everything else is blocked: ::, ::1, IPv4-compatible ::a.b.c.d and the rest of
  // ::/8, 64:ff9b:1::/48 local NAT64, 100::/64 discard, fc00::/7 unique local, fe80::/10 link-local, fec0::/10
  // site-local and ff00::/8 multicast.
  if ((g0 & 0xe000) !== 0x2000) return true;
  // 2001::/23 IETF protocol assignments, which hold Teredo 2001::/32, benchmarking and ORCHID.
  if (g0 === 0x2001 && g1 < 0x200) return true;
  // 2001:db8::/32 documentation.
  if (g0 === 0x2001 && g1 === 0xdb8) return true;
  // 2002::/16 6to4: it tunnels to any IPv4 address, private ones included.
  if (g0 === 0x2002) return true;
  // 3fff::/20 documentation.
  if (g0 === 0x3fff && g1 < 0x1000) return true;
  return false;
}

// ---------------------------------------------------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------------------------------------------------

/**
 * True when a server must not connect to this address: private, loopback, link-local, carrier-grade NAT, multicast,
 * unspecified, broadcast, documentation, benchmarking or reserved, in IPv4 or IPv6. IPv4-mapped and NAT64 addresses are
 * judged by the IPv4 address inside them. Accepts brackets (`[::1]`). A zone id (`fe80::1%en0`) and anything that
 * doesn't parse are blocked.
 */
export function isBlockedAddress(ip: string): boolean {
  if (typeof ip !== 'string') return true;
  let value = ip.trim();
  if (value.startsWith('[') && value.endsWith(']')) value = value.slice(1, -1);
  if (!value || value.includes('%')) return true;
  if (value.includes(':')) {
    const groups = parseIPv6(value);
    return groups ? isBlockedIPv6(groups) : true;
  }
  const dotted = parseIPv4Literal(value);
  return dotted ? isBlockedIPv4(dotted) : true;
}

/** The IP family of a literal address (brackets removed), or `null` for a host name. */
function literalFamily(host: string): 4 | 6 | null {
  if (host.includes(':')) return 6;
  return parseIPv4Literal(host) !== null ? 4 : null;
}

function stripBrackets(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
}

/**
 * Parses a URL a server is about to fetch and returns it, or throws a {@link LinkPreviewError}. It must be http or
 * https (`invalid_url`), carry no user name or password (`invalid_url`), name an allowed port (`blocked`), and a
 * literal IP host must be public (`blocked`). `localhost` and `*.localhost` are blocked by name. Host names are
 * resolved separately, with {@link resolveHost}.
 */
export function checkUrl(url: string | URL, options: CheckUrlOptions = {}): URL {
  const allowPorts = options.allowPorts ?? [80, 443];
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new LinkPreviewError('invalid_url', 'The link is not a valid URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new LinkPreviewError('invalid_url', 'Only http and https links can be previewed.');
  }
  if (parsed.username || parsed.password) {
    throw new LinkPreviewError('invalid_url', 'Links with a user name or password are not previewed.');
  }
  const port = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;
  if (!allowPorts.includes(port)) throw new LinkPreviewError('blocked', `Port ${port} is not allowed.`);
  const host = stripBrackets(parsed.hostname).replace(/\.$/, '').toLowerCase();
  if (!host) throw new LinkPreviewError('invalid_url', 'The link has no host.');
  if (host === 'localhost' || host.endsWith('.localhost')) {
    throw new LinkPreviewError('blocked', 'The link points to this machine.');
  }
  if (literalFamily(host) !== null && isBlockedAddress(host)) {
    throw new LinkPreviewError('blocked', 'The link points to a private or reserved address.');
  }
  return parsed;
}

/**
 * Resolves a host to every address it has and returns the first one to connect to. Throws a
 * {@link LinkPreviewError}: `blocked` when any address is private or reserved, `unavailable` when the host doesn't
 * resolve. A literal IP host is checked without a lookup.
 */
export async function resolveHost(hostname: string, lookup: LookupFunction): Promise<ResolvedAddress> {
  const host = stripBrackets(hostname).replace(/\.$/, '');
  const family = literalFamily(host);
  if (family !== null) {
    if (isBlockedAddress(host))
      throw new LinkPreviewError('blocked', 'The link points to a private or reserved address.');
    return { address: family === 4 ? (parseIPv4Literal(host) ?? host) : host, family };
  }
  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new LinkPreviewError('unavailable', 'The link’s host could not be found.');
  }
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new LinkPreviewError('unavailable', 'The link’s host could not be found.');
  }
  for (const entry of addresses) {
    if (!entry || typeof entry.address !== 'string' || isBlockedAddress(entry.address)) {
      throw new LinkPreviewError('blocked', 'The link’s host resolves to a private or reserved address.');
    }
  }
  const first = addresses[0];
  if (!first) throw new LinkPreviewError('unavailable', 'The link’s host could not be found.');
  return { address: first.address, family: first.address.includes(':') ? 6 : 4 };
}

/**
 * A `lookup` for `net.connect()` (and undici's `connect` option) that answers every query with one address that was
 * already checked, so the connection can't be redirected by a second DNS answer.
 */
export function createPinnedLookup(pinned: ResolvedAddress): NetLookupFunction {
  return (_hostname, options, callback) => {
    if (options.all) callback(null, [{ address: pinned.address, family: pinned.family }]);
    else callback(null, pinned.address, pinned.family);
  };
}
