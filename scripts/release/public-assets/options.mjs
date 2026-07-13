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

  return {
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
