export function isSafeExternalHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !isLocalOrPrivateHost(url.hostname);
  } catch {
    return false;
  }
}

export function isLocalOrPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host === "::1" ||
    host === "0:0:0:0:0:0:0:1" ||
    host === "0.0.0.0" ||
    host.startsWith("127.")
  ) {
    return true;
  }

  return (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}
