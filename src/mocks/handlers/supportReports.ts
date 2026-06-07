type MockFeedbackCategory = "bug" | "feature" | "question";

interface MockConfigSummaryInput {
  keywords_boost: string[];
  location_preferences: {
    cities: string[];
  };
  salary_floor_usd: number;
  alerts: {
    email?: {
      enabled?: boolean;
    };
  };
  company_blacklist?: unknown;
  company_whitelist?: unknown;
}

export function generateMockFeedbackReport(
  args: Record<string, unknown> | undefined,
  config: MockConfigSummaryInput,
  hasResume: boolean,
): string {
  const category = getMockFeedbackCategory(args);
  const description = sanitizeMockSupportReportText(
    getStringArg(args, "description") ?? "",
  );
  const includeDebugInfo = booleanValue(getArg(args, "includeDebugInfo"), false);
  const systemInfo = getMockSystemInfo();
  const configSummary = getMockConfigSummary(config, hasResume);
  const timestamp = new Date().toISOString();

  const lines = [
    "JOBSENTINEL SAFE SUPPORT REPORT",
    "",
    `Report type: ${getMockFeedbackCategoryLabel(category)}`,
    `Created: ${timestamp}`,
    "",
    "WHAT YOU WROTE",
    "",
    description,
    "",
    "APP AND DEVICE (common private details hidden)",
    "",
    `App version: ${systemInfo.app_version}`,
    `Device: ${systemInfo.platform} ${systemInfo.os_version}`,
    `System type: ${systemInfo.architecture}`,
  ];

  if (includeDebugInfo) {
    lines.push(
      "",
      "JOBSENTINEL SETUP (counts only)",
      "",
      `Job sources turned on: ${configSummary.scrapers_enabled}`,
      `Search words saved: ${configSummary.keywords_count}`,
      `Location preferences: ${configSummary.has_location_prefs ? "configured" : "not set"}`,
      `Salary preferences: ${configSummary.has_salary_prefs ? "configured" : "not set"}`,
      `Notifications: ${configSummary.notifications_configured} channel(s)`,
    );
  }

  lines.push(
    "",
    "SUPPORT SUMMARY",
    "",
    JSON.stringify(
      {
        schema_version: "1.0",
        app_version: systemInfo.app_version,
        category,
        timestamp,
        platform: {
          os: systemInfo.platform,
          os_version: systemInfo.os_version,
          arch: systemInfo.architecture,
        },
        config_summary: includeDebugInfo ? configSummary : null,
        debug_events_count: 0,
      },
      null,
      2,
    ),
    "",
    "END OF SAFE SUPPORT REPORT",
  );

  return lines.join("\n");
}

export function getMockFeedbackFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `jobsentinel-feedback-${year}-${month}-${day}-${hour}${minute}.txt`;
}

export function saveMockFeedbackFile(args?: Record<string, unknown>): {
  fileName: string;
  revealToken: string;
} | null {
  const suggestedFilename =
    getStringArg(args, "suggestedFilename") ??
    getStringArg(args, "suggested_filename") ??
    getMockFeedbackFilename();
  const fileName = sanitizeMockFilename(suggestedFilename);
  return {
    fileName,
    revealToken: `mock-feedback:${fileName}`,
  };
}

export function sanitizeMockFeedbackText(args?: Record<string, unknown>): string {
  const content = getStringArg(args, "content") ?? "";
  return sanitizeMockSupportReportText(content);
}

export function getMockSystemInfo() {
  return {
    app_version: "dev",
    platform: "mock",
    os_version: "browser",
    architecture: "wasm",
  };
}

export function getMockConfigSummary(
  config: MockConfigSummaryInput,
  hasResume: boolean,
) {
  return {
    scrapers_enabled: 3,
    keywords_count: config.keywords_boost.length,
    has_location_prefs: config.location_preferences.cities.length > 0,
    has_salary_prefs: config.salary_floor_usd > 0,
    has_company_blocklist: getArrayLength(config.company_blacklist) > 0,
    has_company_allowlist: getArrayLength(config.company_whitelist) > 0,
    notifications_configured: Number(config.alerts.email?.enabled ?? false),
    has_resume: hasResume,
  };
}

function sanitizeMockFilename(filename: string): string {
  const pathSegments = filename.split(/[\\/]+/).filter((segment) => segment.length > 0);
  const basename = pathSegments[pathSegments.length - 1] ?? getMockFeedbackFilename();
  return basename.replace(/[^a-zA-Z0-9._-]/g, "-") || getMockFeedbackFilename();
}

function sanitizeMockSupportReportText(content: string): string {
  let result = content;

  result = result.replace(
    /https:\/\/(?:hooks\.slack\.com|discord(?:app)?\.com\/api\/webhooks|outlook\.office(?:365)?\.com\/webhook|hooks\.discord\.com\/api\/webhooks|hooks\.teams\.com\/workflows)[^\s"'<>\\)]*/gi,
    "[WEBHOOK_CONFIGURED]",
  );
  result = result.replace(/li_at=[^\s;]+/g, "li_at=[REDACTED]");
  result = result.replace(/\/(?:Users|home)\/[^/\s]+/g, "/[USER_PATH]");
  result = result.replace(/[A-Za-z]:\\Users\\[^\\\s]+/g, "C:\\[USER_PATH]");
  result = result.replace(
    /\/(?:private\/var|var\/folders|tmp|var\/tmp|run\/user|Volumes)\/[^\s"'<>\\)]+/g,
    "/[LOCAL_PATH]",
  );
  result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]");
  result = result.replace(
    /(?:\+?1[\s.-]?)?(?:\([2-9][0-9]{2}\)|[2-9][0-9]{2})[\s.-]?[2-9][0-9]{2}[\s.-]?[0-9]{4}\b/g,
    "[PHONE]",
  );
  result = result.replace(
    /(Bearer\s+[^\s"'<>]+|(?:access_token|refresh_token|api[_-]?key|token|secret|password|x-jobsentinel-token)=[^\s&"'<>\\)]+|["']?(?:access_token|refresh_token|api[_-]?key|token|secret|password|x-jobsentinel-token)["']?\s*:\s*["'][^"']+["']|(?:token|secret|password)\s+[^\s"'<>]+)/gi,
    "[TOKEN]",
  );
  result = result.replace(/https?:\/\/[^\s"'<>\\)]+/gi, "[URL]");
  result = result.replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, "[IP_ADDRESS]");
  result = result.replace(
    /\b((?:salary|compensation|pay)[ _-]?(?:floor|expectation|target|range|requirement)|expected salary|desired salary|resume(?:[ _-]?(?:text|data|content|summary|excerpt))?|cover[ _-]?letter(?:[ _-]?(?:text|data|content|summary|excerpt))?|private[ _-]?notes?|application[ _-]?(?:history|notes?)|screening[ _-]?(?:questions?|answers?)|question[ _-]?text|answer[ _-]?text|location[ _-]?preferences?|career[ _-]?goals?|personal[ _-]?circumstances?|(?:full|candidate|applicant|user|your)[ _-]?name)\s*[:=]\s*[^\r\n]+/gim,
    "$1: [JOB_SEARCH_DETAIL_REDACTED]",
  );
  result = result.replace(
    /\b((?:my\s+)?(?:salary|compensation|pay)\s+(?:floor|expectation|target|range|requirement)|expected salary|desired salary|private note|application note|screening answer|location preference|career goal|personal circumstance)\s+(?:is|are|was|were)\s+[^\r\n]+/gim,
    "$1 [JOB_SEARCH_DETAIL_REDACTED]",
  );
  result = result.replace(
    /\b((?:my|candidate|applicant|user)\s+name)\s+(?:is|was)\s+[^\r\n]+/gim,
    "$1 [PERSON_NAME_REDACTED]",
  );
  result = result.replace(/"[^"]+"/g, "\"[REDACTED]\"");
  result = result.replace(/'[^']+'/g, "'[REDACTED]'");
  result = result.replace(
    /\b((?:while\s+)?(?:applying|applied|interviewing|interviewed|negotiating|rejected|offer(?:ed)?|laid off|layoff|unemployed|employment gap|resume gap|job search urgency)\b[^\r\n]*)/gim,
    "[JOB_SEARCH_DETAIL_REDACTED]",
  );

  return result;
}

function getMockFeedbackCategory(args?: Record<string, unknown>): MockFeedbackCategory {
  const category = getStringArg(args, "category");
  return category === "bug" || category === "feature" || category === "question"
    ? category
    : "question";
}

function getMockFeedbackCategoryLabel(category: MockFeedbackCategory): string {
  switch (category) {
    case "bug":
      return "Problem Report";
    case "feature":
      return "Improvement Idea";
    case "question":
      return "General Feedback";
  }
}

function getStringArg(
  args: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = getArg(args, key);
  return typeof value === "string" ? value : undefined;
}

function getArg(
  args: Record<string, unknown> | undefined,
  key: string,
): unknown {
  const nestedArgs = args?.payload as Record<string, unknown> | undefined;
  return args?.[key] ?? nestedArgs?.[key];
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function getArrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}
