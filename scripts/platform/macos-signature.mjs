export function parseCodesignDetails(output) {
  const details = {
    authorities: [],
    runtime: false,
    signature: "",
    teamIdentifier: "",
    timestamp: "",
  };

  for (const line of String(output ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("Authority=")) {
      details.authorities.push(trimmed.slice("Authority=".length));
    } else if (trimmed.startsWith("Runtime Version=")) {
      details.runtime = true;
    } else if (trimmed.startsWith("Signature size=")) {
      details.signature = trimmed.slice("Signature ".length);
    } else if (trimmed.startsWith("Signature=")) {
      details.signature = trimmed.slice("Signature=".length);
    } else if (trimmed.startsWith("TeamIdentifier=")) {
      details.teamIdentifier = trimmed.slice("TeamIdentifier=".length);
    } else if (trimmed.startsWith("Timestamp=")) {
      details.timestamp = trimmed.slice("Timestamp=".length);
    }
  }

  return details;
}

export function extractTeamIdFromSigningIdentity(identity) {
  const match = String(identity ?? "").match(/\(([A-Z0-9]{10})\)\s*$/);
  return match ? match[1] : undefined;
}

export function developerIdSignatureViolations(
  details,
  { expectedTeamId, requireHardenedRuntime = false } = {},
) {
  const violations = [];
  const signature = String(details?.signature ?? "").toLowerCase();
  const teamIdentifier = String(details?.teamIdentifier ?? "");
  const authorities = Array.isArray(details?.authorities) ? details.authorities : [];

  if (!details?.signature || signature.includes("adhoc")) {
    violations.push("signature is ad-hoc or missing");
  }

  if (!authorities.some((authority) => authority.startsWith("Developer ID Application: "))) {
    violations.push("Developer ID Application authority is missing");
  }

  if (!teamIdentifier || teamIdentifier === "not set") {
    violations.push("TeamIdentifier is missing");
  } else if (expectedTeamId && teamIdentifier !== expectedTeamId) {
    violations.push(`TeamIdentifier expected ${expectedTeamId}, found ${teamIdentifier}`);
  }

  if (!details?.timestamp) {
    violations.push("secure timestamp is missing");
  }

  if (requireHardenedRuntime && !details?.runtime) {
    violations.push("hardened runtime is missing");
  }

  return violations;
}

export function assertDeveloperIdSignature(details, options = {}) {
  const violations = developerIdSignatureViolations(details, options);
  if (violations.length > 0) {
    throw new Error(`Developer ID signature check failed:\n- ${violations.join("\n- ")}`);
  }
}
