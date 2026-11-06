// Parses platform scope, draft access and final-phase verification options.
const defaultRepo = "cboyd0319/JobSentinel";

function getArgValue(args, name) {
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) return args[exactIndex + 1];

  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : undefined;
}

function hasArg(args, name) {
  return args.some((arg) => arg === name || arg.startsWith(`${name}=`));
}

function splitList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseArgs(args) {
  const platforms = splitList(
    getArgValue(args, "--platforms") ?? "windows,macos,linux",
  );
  const requireSupplyChain =
    hasArg(args, "--require-supply-chain") ||
    !hasArg(args, "--no-require-supply-chain");

  if (platforms.length === 0 || new Set(platforms).size !== platforms.length ||
    platforms.some(platform => !["windows", "macos", "linux"].includes(platform))) throw new Error("Invalid release platform scope.");

  if (hasArg(args, "--draft") && hasArg(args, "--unauthenticated")) throw new Error("Draft and unauthenticated modes conflict.");
  if (hasArg(args, "--require-phases") && (!hasArg(args, "--draft") ||
    !/^[a-f0-9]{40}$/.test(getArgValue(args, "--expected-revision") ?? "") ||
    ["--no-require-checksum", "--no-require-supply-chain", "--no-require-attestations"].some(flag => hasArg(args, flag)))) {
    throw new Error("Phase verification requires authenticated draft, source revision and all supply-chain checks.");
  }

  if (hasArg(args, "--local-macos") && (!platforms.includes("macos") ||
    !/^[a-f0-9]{40}$/.test(getArgValue(args, "--expected-revision") ?? "") ||
    ["--no-require-checksum", "--no-require-supply-chain", "--no-require-attestations"].some(flag => hasArg(args, flag)))) {
    throw new Error("Local macOS verification requires source revision, phase evidence and full integrity checks.");
  }

  if ((hasArg(args, "--expected-snapshot") || hasArg(args, "--write-snapshot-output")) && !hasArg(args, "--require-phases")) throw new Error("Snapshot binding requires phase verification.");
  if (hasArg(args, "--expected-snapshot") && !/^[a-f0-9]{64}$/.test(getArgValue(args, "--expected-snapshot") ?? "")) throw new Error("Invalid approved snapshot.");

  return {
    expectedSnapshot: getArgValue(args, "--expected-snapshot"),
    writeSnapshotOutput: hasArg(args, "--write-snapshot-output"),
    localMacos: hasArg(args, "--local-macos"),
    draft: hasArg(args, "--draft"),
    requirePhases: hasArg(args, "--require-phases"),
    expectedRevision: getArgValue(args, "--expected-revision"),
    expectedVersion: getArgValue(args, "--expected-version"),
    platforms,
    releaseTag: getArgValue(args, "--tag"),
    repo: getArgValue(args, "--repo") ?? defaultRepo,
    requireAttestations:
      requireSupplyChain &&
      !hasArg(args, "--no-require-attestations") &&
      !hasArg(args, "--no-require-supply-chain"),
    requireChecksum: !hasArg(args, "--no-require-checksum"),
    requireSupplyChain,
    requireWindowsUnsignedLabel: hasArg(args, "--require-windows-unsigned-label"),
  };
}
