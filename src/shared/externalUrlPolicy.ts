/** Validates public HTTPS metadata URLs without credentials or private network targets. */

export function isCredentialFreePublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname !== "" &&
      url.username === "" && url.password === "" && url.search === "" &&
      url.hash === "" && !isLocalOrPrivateHost(url.hostname);
  } catch {
    return false;
  }
}

export function isLocalOrPrivateHost(hostname: string): boolean {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    ["local", "lan", "home", "internal", "corp"].some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    )
  ) return true;

  if (host.includes(":")) {
    if (host.startsWith("::ffff:")) {
      const mapped = host.slice("::ffff:".length);
      if (mapped.includes(".")) return isLocalOrPrivateHost(mapped);
      const [upper, lower] = mapped.split(":");
      if (upper && lower && /^[0-9a-f]{1,4}$/u.test(upper) && /^[0-9a-f]{1,4}$/u.test(lower)) {
        const high = Number.parseInt(upper, 16);
        const low = Number.parseInt(lower, 16);
        return isLocalOrPrivateHost(`${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`);
      }
    }
    return host === "::" || host === "::1" || isIanaNonGlobalIpv6(host) || host.startsWith("ff") ||
      /^f[cd][0-9a-f:]*$/u.test(host) || /^fe[89ab][0-9a-f:]*$/u.test(host);
  }

  const labels = host.split(".");
  return labels.some((_, index) => isNonPublicIpv4(labels.slice(index, index + 4)));
}

function isIanaNonGlobalIpv6(host: string): boolean {
  const segments = ipv6Segments(host);
  if (segments === null) return false;
  const first = segments[0] ?? -1;
  const second = segments[1] ?? -1;
  const third = segments[2] ?? -1;
  const fourth = segments[3] ?? -1;
  return first === 0x64 && second === 0xff9b && third === 1 ||
    first === 0x100 && second === 0 && third === 0 && (fourth === 0 || fourth === 1) ||
    first === 0x2001 && second === 0xdb8 || first === 0x3fff && second <= 0xfff ||
    first === 0x5f00 || isNonGlobalIetfProtocolIpv6(segments);
}

function ipv6Segments(host: string): number[] | null {
  const halves = host.split("::");
  if (halves.length > 2) return null;
  const leading = halves[0] === "" ? [] : halves[0]?.split(":") ?? [];
  const trailing = halves.length === 2 && halves[1] !== "" ? halves[1]?.split(":") ?? [] : [];
  const zeroCount = 8 - leading.length - trailing.length;
  if (halves.length === 1 ? zeroCount !== 0 : zeroCount < 1) return null;
  const pieces = [...leading, ...Array<string>(zeroCount).fill("0"), ...trailing];
  if (pieces.length !== 8 || pieces.some((piece) => !/^[0-9a-f]{1,4}$/u.test(piece))) return null;
  return pieces.map((piece) => Number.parseInt(piece, 16));
}

function isNonGlobalIetfProtocolIpv6(segments: readonly number[]): boolean {
  const first = segments[0] ?? -1;
  const second = segments[1] ?? -1;
  const third = segments[2] ?? -1;
  const tail = segments.slice(2);
  const pcpTurnDnsSd = second === 1 && tail.slice(0, 5).every((segment) => segment === 0) &&
    [1, 2, 3].includes(tail[5] ?? -1);
  const reachable = pcpTurnDnsSd || second === 3 || second === 4 && third === 0x112 ||
    second >= 0x20 && second <= 0x3f;
  return first === 0x2001 && second >= 0 && second <= 0x1ff && !reachable;
}

function isNonPublicIpv4(labels: string[]): boolean {
  if (labels.length !== 4 || labels.some((label) => !/^\d+$/u.test(label))) return false;
  const octets = labels.map(Number);
  if (octets.some((octet) => octet > 255)) return false;
  const first = octets[0] ?? -1;
  const second = octets[1] ?? -1;
  const third = octets[2] ?? -1;
  const fourth = octets[3] ?? -1;
  const ianaProtocolAssignment = first === 192 && second === 0 && third === 0 &&
    fourth !== 9 && fourth !== 10;
  const documentation = first === 192 && second === 0 && third === 2 ||
    first === 198 && second === 51 && third === 100 ||
    first === 203 && second === 0 && third === 113;
  const benchmarking = first === 198 && (second === 18 || second === 19);
  return first === 0 || first === 10 || first === 127 ||
    first === 169 && second === 254 || first === 172 && second >= 16 && second <= 31 ||
    first === 192 && second === 168 || first === 100 && second >= 64 && second <= 127 ||
    ianaProtocolAssignment || documentation || benchmarking || first >= 224;
}
