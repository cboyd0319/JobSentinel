/**
 * URL validation utilities for security
 */

/**
 * Validates that a URL is safe to open
 * - Must be http or https scheme
 * - Cannot be localhost or private IP addresses
 * - Cannot be file:// or other potentially dangerous schemes
 */
export function isValidJobUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);

    // Only allow http and https schemes
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    // Block localhost and private IP ranges
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
    const ipHostname = hostname.startsWith('[') && hostname.endsWith(']')
      ? hostname.slice(1, -1)
      : hostname;

    // Block localhost variants
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      ipHostname === '127.0.0.1' ||
      ipHostname === '::1'
    ) {
      return false;
    }

    if (isBlockedIpv4Address(ipHostname)) {
      return false;
    }

    const mappedIpv4 = ipv4FromMappedIpv6(ipHostname);
    if (mappedIpv4 && isBlockedIpv4Address(mappedIpv4)) {
      return false;
    }

    // Block private IPv6 ranges (fc00::/7, fe80::/10)
    if (ipHostname.includes(':')) {
      if (
        ipHostname === '::' ||
        ipHostname === '::1' ||
        ipHostname.startsWith('fc') ||
        ipHostname.startsWith('fd') ||
        ipHostname.startsWith('fe80') ||
        ipHostname.startsWith('ff')
      ) {
        return false;
      }
    }

    return true;
  } catch {
    // Invalid URL format
    return false;
  }
}

function isBlockedIpv4Address(hostname: string): boolean {
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) {
    return false;
  }

  const octets = ipv4Match.slice(1).map(Number);
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return true;
  }

  const [first, second, third, fourth] = octets;

  // 0.0.0.0/8 and 127.0.0.0/8
  if (first === 0 || first === 127) {
    return true;
  }

  // 10.0.0.0/8
  if (first === 10) {
    return true;
  }

  // 172.16.0.0/12
  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  // 192.168.0.0/16
  if (first === 192 && second === 168) {
    return true;
  }

  // 169.254.0.0/16 (link-local)
  if (first === 169 && second === 254) {
    return true;
  }

  // 224.0.0.0/4 (multicast)
  if (first >= 224 && first <= 239) {
    return true;
  }

  // 255.255.255.255 (limited broadcast)
  if (first === 255 && second === 255 && third === 255 && fourth === 255) {
    return true;
  }

  // 100.64.0.0/10 (carrier-grade NAT/shared address space)
  return first === 100 && second >= 64 && second <= 127;
}

function ipv4FromMappedIpv6(hostname: string): string | null {
  const match = hostname.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!match) {
    return null;
  }

  const highWord = Number.parseInt(match[1], 16);
  const lowWord = Number.parseInt(match[2], 16);
  if (!Number.isFinite(highWord) || !Number.isFinite(lowWord)) {
    return null;
  }

  return [
    highWord >> 8,
    highWord & 0xff,
    lowWord >> 8,
    lowWord & 0xff,
  ].join(".");
}
