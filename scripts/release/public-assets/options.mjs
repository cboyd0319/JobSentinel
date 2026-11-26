// Parses release asset verifier options for draft (pre-publication) and public (post-publication) modes.
import { getArgValue, getRepoArg, hasArg, splitList } from "../args.mjs";

const defaultRepo = "cboyd0319/JobSentinel";

export function parseArgs(args) {
  const platforms = getArgValue(args, "--platforms");
  const requireSupplyChain =
    hasArg(args, "--require-supply-chain") ||
    !hasArg(args, "--no-require-supply-chain");

  return {
    draft: hasArg(args, "--draft"),
    draftManifest: getArgValue(args, "--draft-manifest"),
    evidenceRevision: getArgValue(args, "--evidence-revision"),
    expectedRevision: getArgValue(args, "--expected-revision"),
    expectedVersion: getArgValue(args, "--expected-version"),
    githubOutput: getArgValue(args, "--github-output"),
    platforms: platforms === undefined ? undefined : splitList(platforms),
    releaseTag: getArgValue(args, "--tag"),
    repo: getRepoArg(args, defaultRepo),
    requireAttestations:
      requireSupplyChain &&
      !hasArg(args, "--no-require-attestations") &&
      !hasArg(args, "--no-require-supply-chain"),
    requireChecksum: !hasArg(args, "--no-require-checksum"),
    requireSupplyChain,
    requireWindowsUnsignedLabel: hasArg(args, "--require-windows-unsigned-label"),
    selection: getArgValue(args, "--selection"),
  };
}
