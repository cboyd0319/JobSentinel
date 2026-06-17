import { invoke } from "@tauri-apps/api/core";
import {
  validateDiscordWebhook,
  validateSlackWebhook,
  validateTeamsWebhook,
} from "../utils/formValidation";

// Ghost detection configuration interface
export interface GhostConfig {
  stale_threshold_days: number;
  repost_threshold: number;
  min_description_length: number;
  penalize_missing_salary: boolean;
  warning_threshold: number;
  hide_threshold: number;
}

export interface SettingsProps {
  onClose: () => void;
}

export interface JobsWithGptPayload {
  endpoint: string;
  titles: string[];
  location?: string | null;
  remote_only: boolean;
  limit: number;
}

export interface JobsWithGptApproval {
  enabled: boolean;
  payload?: JobsWithGptPayload | null;
  approved_at?: string | null;
}

export type SourceRequestOutcome = "started" | "success" | "failure" | "timeout";

export interface SourceRequestSummary {
  id: number;
  source: string;
  sentAt: string;
  endpointHost?: string | null;
  titleCount: number;
  hasLocation: boolean;
  remoteOnly: boolean;
  resultLimit: number;
  outcome: SourceRequestOutcome;
}

// Config interface without sensitive credential fields (stored through secure storage)
export interface Config {
  title_allowlist: string[];
  title_blocklist: string[];
  keywords_boost: string[];
  keywords_exclude: string[];
  location_preferences: {
    allow_remote: boolean;
    allow_hybrid: boolean;
    allow_onsite: boolean;
    cities: string[];
  };
  salary_floor_usd: number;
  salary_target_usd?: number;
  company_whitelist: string[];
  company_blacklist: string[];
  auto_refresh: {
    enabled: boolean;
    interval_minutes: number;
  };
  alerts: {
    slack: {
      enabled: boolean;
      // webhook_url stored securely
    };
    email: {
      enabled: boolean;
      smtp_server: string;
      smtp_port: number;
      smtp_username: string;
      // smtp_password stored securely
      from_email: string;
      to_emails: string[];
      use_starttls: boolean;
    };
    discord: {
      enabled: boolean;
      // webhook_url stored securely
      user_id_to_mention?: string;
    };
    telegram: {
      enabled: boolean;
      // bot_token stored securely
      chat_id?: string;
    };
    teams: {
      enabled: boolean;
      // webhook_url stored securely
    };
    desktop: {
      enabled: boolean;
      show_when_focused: boolean;
      play_sound: boolean;
    };
  };
  linkedin: {
    enabled: boolean;
    // LinkedIn stays user-opened; no session cookie is stored.
    query: string;
    location: string;
    remote_only: boolean;
    limit: number;
  };
  remoteok: {
    enabled: boolean;
    tags: string[];
    limit: number;
  };
  weworkremotely: {
    enabled: boolean;
    category?: string;
    limit: number;
  };
  builtin: {
    enabled: boolean;
    cities: string[];
    category?: string;
    limit: number;
  };
  hn_hiring: {
    enabled: boolean;
    remote_only: boolean;
    limit: number;
  };
  dice: {
    enabled: boolean;
    query: string;
    location?: string;
    limit: number;
  };
  yc_startup: {
    enabled: boolean;
    query?: string;
    remote_only: boolean;
    limit: number;
  };
  usajobs: {
    enabled: boolean;
    // api_key stored securely
    email: string;
    keywords?: string;
    location?: string;
    radius?: number;
    remote_only: boolean;
    pay_grade_min?: number;
    pay_grade_max?: number;
    date_posted_days: number;
    limit: number;
  };
  simplyhired: {
    enabled: boolean;
    query: string;
    location?: string;
    limit: number;
  };
  glassdoor: {
    enabled: boolean;
    query: string;
    location?: string;
    limit: number;
  };
  jobswithgpt_endpoint: string;
  jobswithgpt_approval: JobsWithGptApproval;
  use_resume_matching: boolean;
}

export type GhostPreset = "lenient" | "balanced" | "strict";
export type GhostPresetSelection = GhostPreset | "custom";

export const GHOST_PRESETS: GhostPreset[] = ["lenient", "balanced", "strict"];

export const GHOST_PRESET_LABELS: Record<GhostPreset, string> = {
  lenient: "Widest search",
  balanced: "Balanced",
  strict: "Fresh and verified first",
};

export const GHOST_PRESET_DESCRIPTIONS: Record<GhostPresetSelection, string> = {
  lenient: "Shows the broadest list and warns only on stronger stale-posting signals.",
  balanced: "Recommended. Keeps jobs visible while warning sooner when posting evidence is weak.",
  strict: "Warns sooner about old, reposted, missing-pay, or thin postings. Some legitimate jobs may need review.",
  custom: "Use detailed controls if you want to tune how early warnings appear.",
};

export function formatPostingRiskWarningLabel(value: number): string {
  if (value <= 0.2) return "Very early";
  if (value <= 0.35) return "Early";
  if (value <= 0.5) return "Balanced";
  return "Later";
}

export function formatPostingRiskHideLabel(value: number): string {
  if (value <= 0.55) return "Hide more flagged jobs";
  if (value <= 0.75) return "Balanced";
  return "Keep more visible";
}

// Credentials stored in OS keyring (macOS Keychain, Windows Credential Manager)
export interface Credentials {
  slack_webhook: string;
  smtp_password: string;
  discord_webhook: string;
  teams_webhook: string;
  telegram_bot_token: string;
  usajobs_api_key: string;
}

// Credential key names (must match backend CredentialKey enum)
export type CredentialKey =
  | "slack_webhook"
  | "smtp_password"
  | "discord_webhook"
  | "teams_webhook"
  | "telegram_bot_token"
  | "usajobs_api_key";

export interface CredentialStatusEntry {
  key: CredentialKey;
  exists: boolean;
  available?: boolean;
}

export interface CredentialStatusValue {
  exists: boolean;
  available: boolean;
  state: CredentialStatusState;
}

export type CredentialStatusState =
  | "empty"
  | "expected"
  | "saved"
  | "needs_attention";

export type CredentialStatusMap = Record<CredentialKey, CredentialStatusValue>;

// Helper to store a credential in secure storage
export async function storeCredential(
  key: CredentialKey,
  value: string,
): Promise<void> {
  await invoke("store_credential", { key, value });
}

// Helper to check if a credential exists
export async function hasCredential(key: CredentialKey): Promise<boolean> {
  return await invoke<boolean>("has_credential", { key });
}

export async function getCredentialStatusEntries(): Promise<CredentialStatusEntry[]> {
  return await invoke<CredentialStatusEntry[]>("get_credential_status");
}

export function credentialExists(
  credentialStatus: CredentialStatusMap,
  key: CredentialKey,
): boolean {
  const status = credentialStatus[key];
  return status.state === "saved" || (status.available && status.exists);
}

export function credentialIsExpected(
  credentialStatus: CredentialStatusMap,
  key: CredentialKey,
): boolean {
  return credentialStatus[key].state === "expected";
}

export function credentialNeedsAttention(
  credentialStatus: CredentialStatusMap,
  key: CredentialKey,
): boolean {
  return credentialStatus[key].state === "needs_attention";
}

export const isValidSlackWebhook = (url: string): boolean =>
  validateSlackWebhook(url) === undefined;

export const isValidDiscordWebhook = (url: string): boolean =>
  validateDiscordWebhook(url) === undefined;

export const isValidTeamsWebhook = (url: string): boolean =>
  validateTeamsWebhook(url) === undefined;

export function buildJobsWithGptPayload(config: Config): JobsWithGptPayload | null {
  const endpoint = config.jobswithgpt_endpoint.trim();
  const titles = config.title_allowlist
    .map((title) => title.trim())
    .filter((title) => title.length > 0);

  if (!endpoint || titles.length === 0) {
    return null;
  }

  return {
    endpoint,
    titles,
    location: null,
    remote_only:
      config.location_preferences.allow_remote &&
      !config.location_preferences.allow_onsite,
    limit: 100,
  };
}

export function formatJobSourceSite(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "Hidden until the link is valid";
  }
}

function sameStringArray(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function sameJobsWithGptPayload(
  left?: JobsWithGptPayload | null,
  right?: JobsWithGptPayload | null,
): boolean {
  if (!left || !right) return false;

  return (
    left.endpoint === right.endpoint &&
    sameStringArray(left.titles, right.titles) &&
    (left.location ?? null) === (right.location ?? null) &&
    left.remote_only === right.remote_only &&
    left.limit === right.limit
  );
}

export function isCurrentJobsWithGptPayloadApproved(
  config: Config,
  payload: JobsWithGptPayload | null,
): boolean {
  return (
    config.jobswithgpt_approval.enabled &&
    sameJobsWithGptPayload(config.jobswithgpt_approval.payload, payload)
  );
}

export function buildSettingsSourceQuery(
  config: Pick<Config, "title_allowlist" | "keywords_boost">,
): string {
  return [...config.title_allowlist, ...config.keywords_boost]
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
    .slice(0, 4)
    .join(" ")
    .slice(0, 200);
}

export function getSettingsSourceLocation(
  config: Pick<Config, "location_preferences">,
): string | undefined {
  return config.location_preferences.cities
    .map((city) => city.trim())
    .find((city) => city.length > 0);
}

export const isValidEmail = (email: string): boolean => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStringArrayField(
  record: Record<string, unknown>,
  field: string,
): boolean {
  return (
    Array.isArray(record[field]) &&
    (record[field] as unknown[]).every((item) => typeof item === "string")
  );
}

function hasBooleanField(record: Record<string, unknown>, field: string): boolean {
  return typeof record[field] === "boolean";
}

function hasNumberField(record: Record<string, unknown>, field: string): boolean {
  return typeof record[field] === "number";
}

function hasStringField(record: Record<string, unknown>, field: string): boolean {
  return typeof record[field] === "string";
}

function hasOptionalStringField(
  record: Record<string, unknown>,
  field: string,
): boolean {
  return record[field] === undefined || typeof record[field] === "string";
}

function hasOptionalNullableStringField(
  record: Record<string, unknown>,
  field: string,
): boolean {
  return (
    record[field] === undefined ||
    record[field] === null ||
    typeof record[field] === "string"
  );
}

function hasOptionalNumberField(
  record: Record<string, unknown>,
  field: string,
): boolean {
  return record[field] === undefined || typeof record[field] === "number";
}

function recordField(
  record: Record<string, unknown>,
  field: string,
): Record<string, unknown> | null {
  const value = record[field];
  return isPlainRecord(value) ? value : null;
}

function isOptionalJobsWithGptPayload(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!isPlainRecord(value)) return false;

  return (
    hasStringField(value, "endpoint") &&
    hasStringArrayField(value, "titles") &&
    hasOptionalNullableStringField(value, "location") &&
    hasBooleanField(value, "remote_only") &&
    hasNumberField(value, "limit")
  );
}

export function isSettingsBackupConfig(value: unknown): value is Config {
  if (!isPlainRecord(value)) return false;

  const location = recordField(value, "location_preferences");
  const alerts = recordField(value, "alerts");
  const autoRefresh = recordField(value, "auto_refresh");
  const slack = alerts ? recordField(alerts, "slack") : null;
  const email = alerts ? recordField(alerts, "email") : null;
  const discord = alerts ? recordField(alerts, "discord") : null;
  const telegram = alerts ? recordField(alerts, "telegram") : null;
  const teams = alerts ? recordField(alerts, "teams") : null;
  const desktop = alerts ? recordField(alerts, "desktop") : null;
  const linkedin = recordField(value, "linkedin");
  const remoteok = recordField(value, "remoteok");
  const weworkremotely = recordField(value, "weworkremotely");
  const builtin = recordField(value, "builtin");
  const hnHiring = recordField(value, "hn_hiring");
  const dice = recordField(value, "dice");
  const ycStartup = recordField(value, "yc_startup");
  const usajobs = recordField(value, "usajobs");
  const simplyhired = recordField(value, "simplyhired");
  const glassdoor = recordField(value, "glassdoor");
  const jobswithgptApproval = recordField(value, "jobswithgpt_approval");

  return (
    hasStringArrayField(value, "title_allowlist") &&
    hasStringArrayField(value, "title_blocklist") &&
    hasStringArrayField(value, "keywords_boost") &&
    hasStringArrayField(value, "keywords_exclude") &&
    hasStringArrayField(value, "company_whitelist") &&
    hasStringArrayField(value, "company_blacklist") &&
    hasNumberField(value, "salary_floor_usd") &&
    hasOptionalNumberField(value, "salary_target_usd") &&
    !!location &&
    hasBooleanField(location, "allow_remote") &&
    hasBooleanField(location, "allow_hybrid") &&
    hasBooleanField(location, "allow_onsite") &&
    hasStringArrayField(location, "cities") &&
    !!autoRefresh &&
    hasBooleanField(autoRefresh, "enabled") &&
    hasNumberField(autoRefresh, "interval_minutes") &&
    !!alerts &&
    !!slack &&
    hasBooleanField(slack, "enabled") &&
    !!email &&
    hasBooleanField(email, "enabled") &&
    hasStringField(email, "smtp_server") &&
    hasNumberField(email, "smtp_port") &&
    hasStringField(email, "smtp_username") &&
    hasStringField(email, "from_email") &&
    hasStringArrayField(email, "to_emails") &&
    hasBooleanField(email, "use_starttls") &&
    !!discord &&
    hasBooleanField(discord, "enabled") &&
    hasOptionalStringField(discord, "user_id_to_mention") &&
    !!telegram &&
    hasBooleanField(telegram, "enabled") &&
    hasOptionalStringField(telegram, "chat_id") &&
    !!teams &&
    hasBooleanField(teams, "enabled") &&
    !!desktop &&
    hasBooleanField(desktop, "enabled") &&
    hasBooleanField(desktop, "show_when_focused") &&
    hasBooleanField(desktop, "play_sound") &&
    !!linkedin &&
    hasBooleanField(linkedin, "enabled") &&
    hasStringField(linkedin, "query") &&
    hasStringField(linkedin, "location") &&
    hasBooleanField(linkedin, "remote_only") &&
    hasNumberField(linkedin, "limit") &&
    !!remoteok &&
    hasBooleanField(remoteok, "enabled") &&
    hasStringArrayField(remoteok, "tags") &&
    hasNumberField(remoteok, "limit") &&
    !!weworkremotely &&
    hasBooleanField(weworkremotely, "enabled") &&
    hasOptionalStringField(weworkremotely, "category") &&
    hasNumberField(weworkremotely, "limit") &&
    !!builtin &&
    hasBooleanField(builtin, "enabled") &&
    hasStringArrayField(builtin, "cities") &&
    hasOptionalStringField(builtin, "category") &&
    hasNumberField(builtin, "limit") &&
    !!hnHiring &&
    hasBooleanField(hnHiring, "enabled") &&
    hasBooleanField(hnHiring, "remote_only") &&
    hasNumberField(hnHiring, "limit") &&
    !!dice &&
    hasBooleanField(dice, "enabled") &&
    hasStringField(dice, "query") &&
    hasOptionalStringField(dice, "location") &&
    hasNumberField(dice, "limit") &&
    !!ycStartup &&
    hasBooleanField(ycStartup, "enabled") &&
    hasOptionalStringField(ycStartup, "query") &&
    hasBooleanField(ycStartup, "remote_only") &&
    hasNumberField(ycStartup, "limit") &&
    !!usajobs &&
    hasBooleanField(usajobs, "enabled") &&
    hasStringField(usajobs, "email") &&
    hasOptionalStringField(usajobs, "keywords") &&
    hasOptionalStringField(usajobs, "location") &&
    hasOptionalNumberField(usajobs, "radius") &&
    hasBooleanField(usajobs, "remote_only") &&
    hasOptionalNumberField(usajobs, "pay_grade_min") &&
    hasOptionalNumberField(usajobs, "pay_grade_max") &&
    hasNumberField(usajobs, "date_posted_days") &&
    hasNumberField(usajobs, "limit") &&
    !!simplyhired &&
    hasBooleanField(simplyhired, "enabled") &&
    hasStringField(simplyhired, "query") &&
    hasOptionalStringField(simplyhired, "location") &&
    hasNumberField(simplyhired, "limit") &&
    !!glassdoor &&
    hasBooleanField(glassdoor, "enabled") &&
    hasStringField(glassdoor, "query") &&
    hasOptionalStringField(glassdoor, "location") &&
    hasNumberField(glassdoor, "limit") &&
    hasStringField(value, "jobswithgpt_endpoint") &&
    !!jobswithgptApproval &&
    hasBooleanField(jobswithgptApproval, "enabled") &&
    isOptionalJobsWithGptPayload(jobswithgptApproval.payload) &&
    hasOptionalNullableStringField(jobswithgptApproval, "approved_at") &&
    hasBooleanField(value, "use_resume_matching")
  );
}

export interface CredentialValidationError {
  title: string;
  message: string;
}

export function getCredentialValidationError(
  credentials: Credentials,
  config?: Config,
  credentialStatus?: CredentialStatusMap,
): CredentialValidationError | null {
  if (validateSlackWebhook(credentials.slack_webhook)) {
    return {
      title: "Check Slack connection link",
      message:
        "Paste the full Slack connection link copied from Slack. If you are not sure, leave it blank and set it up later.",
    };
  }

  if (validateDiscordWebhook(credentials.discord_webhook)) {
    return {
      title: "Check Discord connection link",
      message:
        "Paste the full Discord connection link copied from Discord. If you are not sure, leave it blank and set it up later.",
    };
  }

  if (validateTeamsWebhook(credentials.teams_webhook)) {
    return {
      title: "Check Teams connection link",
      message:
        "Paste the full Teams connection link copied from Teams. If you are not sure, leave it blank and set it up later.",
    };
  }

  if (config?.alerts.slack?.enabled) {
    const hasSlackConnection =
      Boolean(
        credentialStatus &&
          credentialExists(credentialStatus, "slack_webhook"),
      ) ||
      Boolean(credentials.slack_webhook.trim());

    if (!hasSlackConnection) {
      return {
        title: "Finish Slack alerts",
        message: "Paste the Slack connection link again, or turn Slack alerts off.",
      };
    }
  }

  if (config?.alerts.email?.enabled) {
    const hasEmailPassword =
      Boolean(
        credentialStatus &&
          credentialExists(credentialStatus, "smtp_password"),
      ) ||
      Boolean(credentials.smtp_password.trim());

    if (!hasEmailPassword) {
      return {
        title: "Finish email alerts",
        message: "Add the email app password, or turn email alerts off.",
      };
    }
  }

  if (config?.alerts.discord?.enabled) {
    const hasDiscordConnection =
      Boolean(
        credentialStatus &&
          credentialExists(credentialStatus, "discord_webhook"),
      ) ||
      Boolean(credentials.discord_webhook.trim());

    if (!hasDiscordConnection) {
      return {
        title: "Finish Discord alerts",
        message: "Paste the Discord connection link again, or turn Discord alerts off.",
      };
    }
  }

  if (config?.alerts.teams?.enabled) {
    const hasTeamsConnection =
      Boolean(
        credentialStatus &&
          credentialExists(credentialStatus, "teams_webhook"),
      ) ||
      Boolean(credentials.teams_webhook.trim());

    if (!hasTeamsConnection) {
      return {
        title: "Finish Teams alerts",
        message: "Paste the Teams connection link again, or turn Teams alerts off.",
      };
    }
  }

  if (config?.alerts.telegram?.enabled) {
    const hasAlertCode =
      Boolean(
        credentialStatus &&
          credentialExists(credentialStatus, "telegram_bot_token"),
      ) ||
      Boolean(credentials.telegram_bot_token.trim());
    const hasDestination = Boolean(config.alerts.telegram.chat_id?.trim());

    if (!hasAlertCode || !hasDestination) {
      return {
        title: "Finish Telegram alerts",
        message:
          "Add the Telegram details shown below, or turn Telegram alerts off.",
      };
    }
  }

  if (config?.usajobs?.enabled) {
    const hasAccessCode =
      Boolean(
        credentialStatus &&
          credentialExists(credentialStatus, "usajobs_api_key"),
      ) ||
      Boolean(credentials.usajobs_api_key.trim());
    const hasEmail = Boolean(config.usajobs.email?.trim());

    if (!hasEmail || !hasAccessCode) {
      return {
        title: "Finish USAJobs scheduled checks",
        message:
          "Add the USAJobs email and access code shown below, or turn USAJobs scheduled checks off.",
      };
    }
  }

  if (config?.dice?.enabled && !config.dice.query.trim()) {
    return {
      title: "Add Dice search words",
      message:
        "Add at least one job title or search word before saving Dice scheduled checks.",
    };
  }

  if (config?.simplyhired?.enabled && !config.simplyhired.query.trim()) {
    return {
      title: "Add SimplyHired search words",
      message:
        "Add at least one job title or search word before saving SimplyHired scheduled checks.",
    };
  }

  if (config?.glassdoor?.enabled && !config.glassdoor.query.trim()) {
    return {
      title: "Add Glassdoor search words",
      message:
        "Add at least one job title or search word before saving Glassdoor scheduled checks.",
    };
  }

  return null;
}
