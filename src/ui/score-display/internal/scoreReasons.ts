export type ScoreReasonGroups = {
  skills: string[];
  salary: string[];
  location: string[];
  company: string[];
  recency: string[];
};

export type ScoreReasonStatus = "pass" | "fail" | "neutral";

const LEGACY_PASS_PREFIX = "\u2713";
const LEGACY_FAIL_PREFIX = "\u2717";

function parseReasonList(reasonsJson?: string | null): string[] {
  if (!reasonsJson) return [];

  try {
    const parsed: unknown = JSON.parse(reasonsJson);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((reason): reason is string => typeof reason === "string");
  } catch {
    return [];
  }
}

export function parseScoreReasons(reasonsJson?: string | null): ScoreReasonGroups {
  const result: ScoreReasonGroups = {
    skills: [],
    salary: [],
    location: [],
    company: [],
    recency: [],
  };

  for (const reason of parseReasonList(reasonsJson)) {
    const lower = reason.toLowerCase();
    if (
      lower.includes("title") ||
      lower.includes("keyword") ||
      lower.includes("allowlist") ||
      lower.includes("blocklist")
    ) {
      result.skills.push(reason);
    } else if (lower.includes("salary")) {
      result.salary.push(reason);
    } else if (
      lower.includes("remote") ||
      lower.includes("location") ||
      lower.includes("hybrid") ||
      lower.includes("onsite")
    ) {
      result.location.push(reason);
    } else if (lower.includes("company")) {
      result.company.push(reason);
    } else if (
      lower.includes("posted") ||
      lower.includes("days ago") ||
      lower.includes("fresh") ||
      lower.includes("old")
    ) {
      result.recency.push(reason);
    } else {
      result.skills.push(reason);
    }
  }

  return result;
}

export function getReasonStatus(reason: string): ScoreReasonStatus {
  const lower = reason.toLowerCase();

  if (
    reason.includes(LEGACY_FAIL_PREFIX) ||
    lower.includes("not in allowlist") ||
    lower.includes("doesn't match") ||
    lower.includes("in blocklist") ||
    lower.includes("blocklisted")
  ) {
    return "fail";
  }

  if (
    reason.includes(LEGACY_PASS_PREFIX) ||
    lower.includes("matches") ||
    lower.includes("meets") ||
    lower.includes("favorite")
  ) {
    return "pass";
  }

  return "neutral";
}

export function displayReasonText(reason: string): string {
  return reason
    .replace(LEGACY_PASS_PREFIX, "")
    .replace(LEGACY_FAIL_PREFIX, "")
    .replace(/^not in allowlist$/i, "Not in your preferred job titles")
    .replace(/not in allowlist/gi, "not in your preferred job titles")
    .replace(
      /\bcompany\s+is\s+in blocklist\b/gi,
      "Company matches something you chose to avoid",
    )
    .replace(/\bin blocklist\b/gi, "matches something you chose to avoid")
    .replace(/\bblocklisted\b/gi, "marked as something to avoid")
    .replace(/\ballowlist\b/gi, "preferred list")
    .replace(/\bblocklist\b/gi, "avoid list")
    .trim();
}
