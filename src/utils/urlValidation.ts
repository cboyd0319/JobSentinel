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
    const hostname = parsed.hostname.toLowerCase();

    // Block localhost variants
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('localhost:')
    ) {
      return false;
    }

    // Block private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const first = Number(ipv4Match[1]);
      const second = Number(ipv4Match[2]);

      // 10.0.0.0/8
      if (first === 10) {
        return false;
      }

      // 172.16.0.0/12
      if (first === 172 && second >= 16 && second <= 31) {
        return false;
      }

      // 192.168.0.0/16
      if (first === 192 && second === 168) {
        return false;
      }

      // 169.254.0.0/16 (link-local)
      if (first === 169 && second === 254) {
        return false;
      }
    }

    // Block private IPv6 ranges (fc00::/7, fe80::/10)
    if (hostname.includes(':')) {
      if (hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80')) {
        return false;
      }
    }

    return true;
  } catch {
    // Invalid URL format
    return false;
  }
}
