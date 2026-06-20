import { mockApplications } from "../data";
import type {
  MockApplication,
  MockApplications,
  MockApplicationStatus,
  MockCredentialKey,
  MockGhostConfig,
  MockSkillInput,
} from "./types";

export const APPLICATION_STATUS_KEYS = Object.keys(
  mockApplications,
) as MockApplicationStatus[];

export function cloneApplications(
  source: Partial<Record<MockApplicationStatus, MockApplication[]>>,
): MockApplications {
  return APPLICATION_STATUS_KEYS.reduce((acc, status) => {
    acc[status] = (source[status] ?? []).map((application) => ({
      ...application,
    }));
    return acc;
  }, {} as MockApplications);
}

export function normalizeApplications(
  source: Partial<Record<MockApplicationStatus, MockApplication[]>>,
): MockApplications {
  return APPLICATION_STATUS_KEYS.reduce((acc, status) => {
    const apps = Array.isArray(source[status]) ? source[status] : [];
    acc[status] = apps.map((application) => ({ ...application }));
    return acc;
  }, {} as MockApplications);
}

export function getDefaultGhostConfig(): MockGhostConfig {
  return {
    stale_threshold_days: 60,
    repost_threshold: 3,
    min_description_length: 200,
    penalize_missing_salary: false,
    warning_threshold: 0.3,
    hide_threshold: 0.7,
  };
}

export function isCredentialKey(value: unknown): value is MockCredentialKey {
  return (
    value === "slack_webhook" ||
    value === "smtp_password" ||
    value === "discord_webhook" ||
    value === "teams_webhook" ||
    value === "telegram_bot_token" ||
    value === "usajobs_api_key" ||
    value === "external_ai_openai_api_key" ||
    value === "external_ai_anthropic_api_key" ||
    value === "external_ai_google_api_key" ||
    value === "external_ai_github_copilot_api_key" ||
    value === "external_ai_custom_api_key"
  );
}

export function getStringArg(
  args: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = getArg(args, key);
  return typeof value === "string" ? value : undefined;
}

export function getNextId(items: Array<{ id: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export function toScoreFraction(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(1, score));
}

export function getResumeIdArg(
  args: Record<string, unknown> | undefined,
): number | undefined {
  return getNumericArg(args, "resumeId") ?? getNumericArg(args, "resume_id");
}

export function getSkillIdArg(
  args: Record<string, unknown> | undefined,
): number | undefined {
  return getNumericArg(args, "skillId") ?? getNumericArg(args, "skill_id");
}

export function normalizeSkillInput(value: unknown): MockSkillInput {
  return value && typeof value === "object" ? (value as MockSkillInput) : {};
}

export function hasOwnInputKey(
  value: MockSkillInput,
  key: keyof MockSkillInput,
): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function trimmedStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function skillYearsOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeProfileInput(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function getJobId(
  args?: Record<string, unknown>,
): number | undefined {
  const value = getArg(args, "id") ?? getArg(args, "jobId");
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function getArg(
  args: Record<string, unknown> | undefined,
  key: string,
): unknown {
  const nestedArgs = args?.payload as Record<string, unknown> | undefined;
  return args?.[key] ?? nestedArgs?.[key];
}

export function getNumericArg(
  args: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const value = getArg(args, key);
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function hasConfiguredUrlList(
  configRecord: Record<string, unknown>,
  key: string,
): boolean {
  const value = configRecord[key];
  return (
    Array.isArray(value) &&
    value.some((item) => typeof item === "string" && item.trim())
  );
}
