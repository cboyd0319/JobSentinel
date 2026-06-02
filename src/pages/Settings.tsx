import { useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { ErrorLogPanel } from "../components/ErrorLogPanel";
import { NotificationPreferences } from "../components/NotificationPreferences";
import { HelpIcon } from "../components/HelpIcon";
import { ScraperHealthDashboard } from "../components/ScraperHealthDashboard";
import { FeedbackModal } from "../components/feedback/FeedbackModal";
import { FeedbackIcon } from "./DashboardIcons";
import { copySanitizedDebugReport, saveSanitizedDebugReport } from "../services/feedbackService";
import { BookmarkletGenerator } from "../components/BookmarkletGenerator";
import { useToast } from "../contexts";
import { logError } from "../utils/errorUtils";
import { getUserFriendlyError } from "../utils/errorMessages";
import { exportConfigToJSON, importConfigFromJSON } from "../utils/export";
import {
  cacheDetectedLocation,
  readCachedDetectedLocation,
  type LocationInfo,
} from "../utils/locationDetection";
import {
  validateDiscordWebhook,
  validateSlackWebhook,
  validateTeamsWebhook,
} from "../utils/formValidation";
import { searchLooksTechFocused } from "../utils/profiles";

// Ghost detection configuration interface
interface GhostConfig {
  stale_threshold_days: number;
  repost_threshold: number;
  min_description_length: number;
  penalize_missing_salary: boolean;
  warning_threshold: number;
  hide_threshold: number;
}

interface SettingsProps {
  onClose: () => void;
}

interface JobsWithGptPayload {
  endpoint: string;
  titles: string[];
  location?: string | null;
  remote_only: boolean;
  limit: number;
}

interface JobsWithGptApproval {
  enabled: boolean;
  payload?: JobsWithGptPayload | null;
  approved_at?: string | null;
}

type SourceRequestOutcome = "started" | "success" | "failure" | "timeout";

interface SourceRequestSummary {
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

// Config interface without sensitive credential fields (stored in OS keyring)
interface Config {
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
      // webhook_url stored securely in keyring
    };
    email: {
      enabled: boolean;
      smtp_server: string;
      smtp_port: number;
      smtp_username: string;
      // smtp_password stored securely in keyring
      from_email: string;
      to_emails: string[];
      use_starttls: boolean;
    };
    discord: {
      enabled: boolean;
      // webhook_url stored securely in keyring
      user_id_to_mention?: string;
    };
    telegram: {
      enabled: boolean;
      // bot_token stored securely in keyring
      chat_id?: string;
    };
    teams: {
      enabled: boolean;
      // webhook_url stored securely in keyring
    };
    desktop: {
      enabled: boolean;
      show_when_focused: boolean;
      play_sound: boolean;
    };
  };
  linkedin: {
    enabled: boolean;
    // session_cookie stored securely in keyring
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
    // api_key stored securely in keyring
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

type GhostPreset = "lenient" | "balanced" | "strict";
type GhostPresetSelection = GhostPreset | "custom";

const GHOST_PRESETS: GhostPreset[] = ["lenient", "balanced", "strict"];

const GHOST_PRESET_LABELS: Record<GhostPreset, string> = {
  lenient: "Widest search",
  balanced: "Balanced",
  strict: "Fresh and verified first",
};

const GHOST_PRESET_DESCRIPTIONS: Record<GhostPresetSelection, string> = {
  lenient: "Shows the broadest list and warns only on stronger stale-posting signals.",
  balanced: "Recommended. Keeps jobs visible while warning sooner when posting evidence is weak.",
  strict: "Warns sooner about old, reposted, missing-pay, or thin postings. Some legitimate jobs may need review.",
  custom: "Use detailed controls if you want to tune how early warnings appear.",
};

function formatPostingRiskWarningLabel(value: number): string {
  if (value <= 0.2) return "Very early";
  if (value <= 0.35) return "Early";
  if (value <= 0.5) return "Balanced";
  return "Later";
}

function formatPostingRiskHideLabel(value: number): string {
  if (value <= 0.55) return "Hide more flagged jobs";
  if (value <= 0.75) return "Balanced";
  return "Keep more visible";
}

// Credentials stored in OS keyring (macOS Keychain, Windows Credential Manager)
interface Credentials {
  slack_webhook: string;
  smtp_password: string;
  discord_webhook: string;
  teams_webhook: string;
  telegram_bot_token: string;
  usajobs_api_key: string;
}

// Credential key names (must match backend CredentialKey enum)
type CredentialKey =
  | "slack_webhook"
  | "smtp_password"
  | "discord_webhook"
  | "teams_webhook"
  | "telegram_bot_token"
  | "usajobs_api_key";

// Helper to store a credential in secure storage
async function storeCredential(
  key: CredentialKey,
  value: string,
): Promise<void> {
  await invoke("store_credential", { key, value });
}

// Helper to check if a credential exists
async function hasCredential(key: CredentialKey): Promise<boolean> {
  return await invoke<boolean>("has_credential", { key });
}

const isValidSlackWebhook = (url: string): boolean =>
  validateSlackWebhook(url) === undefined;

const isValidDiscordWebhook = (url: string): boolean =>
  validateDiscordWebhook(url) === undefined;

const isValidTeamsWebhook = (url: string): boolean =>
  validateTeamsWebhook(url) === undefined;

function buildJobsWithGptPayload(config: Config): JobsWithGptPayload | null {
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

function isCurrentJobsWithGptPayloadApproved(
  config: Config,
  payload: JobsWithGptPayload | null,
): boolean {
  return (
    config.jobswithgpt_approval.enabled &&
    sameJobsWithGptPayload(config.jobswithgpt_approval.payload, payload)
  );
}

const isValidEmail = (email: string): boolean => {
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

function isSettingsBackupConfig(value: unknown): value is Config {
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

interface CredentialValidationError {
  title: string;
  message: string;
}

function getCredentialValidationError(
  credentials: Credentials,
  config?: Config,
  credentialStatus?: Record<CredentialKey, boolean>,
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

  if (config?.alerts.telegram?.enabled) {
    const hasAlertCode =
      Boolean(credentialStatus?.telegram_bot_token) ||
      Boolean(credentials.telegram_bot_token.trim());
    const hasDestination = Boolean(config.alerts.telegram.chat_id?.trim());

    if (!hasAlertCode || !hasDestination) {
      return {
        title: "Finish Telegram setup",
        message:
          "Add the Telegram alert code and destination number, or turn Telegram alerts off.",
      };
    }
  }

  return null;
}

function SecurityBadge({ stored }: { stored?: boolean }) {
  if (stored) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
        Saved securely on this computer
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
          clipRule="evenodd"
        />
      </svg>
      Will be saved securely on this computer
    </span>
  );
}

function formatSourceRequestTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recorded locally";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatSourceRequestOutcome(outcome: SourceRequestOutcome): string {
  switch (outcome) {
    case "success":
      return "Completed";
    case "failure":
      return "Failed";
    case "timeout":
      return "Timed out";
    case "started":
    default:
      return "Started";
  }
}

export default function Settings({ onClose }: SettingsProps) {
  const [config, setConfig] = useState<Config | null>(null);
  const [credentials, setCredentials] = useState<Credentials>({
    slack_webhook: "",
    smtp_password: "",
    discord_webhook: "",
    teams_webhook: "",
    telegram_bot_token: "",
    usajobs_api_key: "",
  });
  const [credentialStatus, setCredentialStatus] = useState<
    Record<CredentialKey, boolean>
  >({
    slack_webhook: false,
    smtp_password: false,
    discord_webhook: false,
    teams_webhook: false,
    telegram_bot_token: false,
    usajobs_api_key: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [blockedTitleInput, setBlockedTitleInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [excludeKeywordInput, setExcludeKeywordInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [whitelistCompanyInput, setWhitelistCompanyInput] = useState("");
  const [blacklistCompanyInput, setBlacklistCompanyInput] = useState("");
  const [showHealthDashboard, setShowHealthDashboard] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [copyingDebugReport, setCopyingDebugReport] = useState(false);
  const [savingDebugReport, setSavingDebugReport] = useState(false);
  const [ghostConfig, setGhostConfig] = useState<GhostConfig | null>(null);
  const [ghostConfigLoading, setGhostConfigLoading] = useState(false);
  const [jobsWithGptLastRequest, setJobsWithGptLastRequest] =
    useState<SourceRequestSummary | null>(null);
  const [ghostPreset, setGhostPreset] = useState<GhostPresetSelection>("balanced");
  const [emailProvider, setEmailProvider] = useState<
    "custom" | "gmail" | "outlook" | "yahoo"
  >("custom");
  const [activeTab, setActiveTab] = useState<"basic" | "advanced">("basic");
  // Loading states for async test/connect buttons
  const [testingSlack, setTestingSlack] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const toast = useToast();

  const handleCopyDebugReport = useCallback(async () => {
    setCopyingDebugReport(true);

    try {
      await copySanitizedDebugReport();
      toast.success(
        "Safe support report copied",
        "Share it only if you want help. Private details are removed first."
      );
    } catch (error) {
      logError("Could not copy support report:", error);
      toast.error(
        "Could not copy safe support report",
        "Try saving the report instead."
      );
    } finally {
      setCopyingDebugReport(false);
    }
  }, [toast]);

  const handleSaveDebugReport = useCallback(async () => {
    setSavingDebugReport(true);

    try {
      const savedFile = await saveSanitizedDebugReport();
      if (savedFile) {
        toast.success(
          "Safe support report saved",
          `Share ${savedFile.fileName} only if you want help.`
        );
      } else {
        toast.info("Safe support report not saved", "No file was created.");
      }
    } catch (error) {
      logError("Failed to save support report:", error);
      toast.error(
        "Could not save safe support report",
        "Try Copy Safe Support Report instead."
      );
    } finally {
      setSavingDebugReport(false);
    }
  }, [toast]);

  // Location detection state
  const [detectedLocation, setDetectedLocation] = useState<LocationInfo | null>(
    () => readCachedDetectedLocation(),
  );
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Email provider templates for easier setup
  const emailProviderTemplates = {
    gmail: {
      server: "smtp.gmail.com",
      port: 587,
      starttls: true,
      hint: "Use an app password from Google Account Security",
    },
    outlook: {
      server: "smtp-mail.outlook.com",
      port: 587,
      starttls: true,
      hint: "Use an app password if Outlook asks for one",
    },
    yahoo: {
      server: "smtp.mail.yahoo.com",
      port: 587,
      starttls: true,
      hint: "Use an app password from Yahoo Account Security",
    },
    custom: {
      server: "",
      port: 587,
      starttls: true,
      hint: "Use this only if your provider gives you manual email details",
    },
  };

  // Ghost detection presets
  const ghostPresets = {
    lenient: {
      stale_threshold_days: 120,
      repost_threshold: 5,
      min_description_length: 100,
      penalize_missing_salary: false,
      warning_threshold: 0.5,
      hide_threshold: 0.85,
    },
    balanced: {
      stale_threshold_days: 60,
      repost_threshold: 3,
      min_description_length: 200,
      penalize_missing_salary: false,
      warning_threshold: 0.3,
      hide_threshold: 0.7,
    },
    strict: {
      stale_threshold_days: 30,
      repost_threshold: 2,
      min_description_length: 300,
      penalize_missing_salary: true,
      warning_threshold: 0.2,
      hide_threshold: 0.5,
    },
  };

  // Apply ghost detection preset
  const applyGhostPreset = (preset: GhostPreset) => {
    setGhostPreset(preset);
    setGhostConfig({ ...ghostPresets[preset] });
  };

  // Apply email provider template
  const applyEmailProvider = (
    provider: "gmail" | "outlook" | "yahoo" | "custom",
  ) => {
    setEmailProvider(provider);
    if (provider !== "custom" && config) {
      const template = emailProviderTemplates[provider];
      setConfig({
        ...config,
        alerts: {
          ...config.alerts,
          email: {
            ...config.alerts.email,
            smtp_server: template.server,
            smtp_port: template.port,
            use_starttls: template.starttls,
          },
        },
      });
    }
  };

  // Smart job board recommendations based on user preferences (memoized)
  const jobBoardRecommendations = useMemo(() => {
    const recommendations: {
      board: string;
      reason: string;
      enable: () => void;
    }[] = [];
    const keywords = [
      ...(config?.keywords_boost ?? []),
      ...(config?.title_allowlist ?? []),
    ].map((k) => k.toLowerCase());
    const allowRemote = config?.location_preferences?.allow_remote ?? false;
    const cities = config?.location_preferences?.cities ?? [];
    const isTechFocused = searchLooksTechFocused(keywords);
    const hasRemoteIntent = allowRemote || keywords.some((k) => k.includes("remote"));

    // Remote tech-focused boards
    if (isTechFocused && hasRemoteIntent) {
      if (!config?.remoteok?.enabled) {
        recommendations.push({
          board: "RemoteOK",
          reason: "Useful for remote tech roles",
          enable: () =>
            setConfig({
              ...config!,
              remoteok: {
                ...config?.remoteok,
                enabled: true,
                tags: config?.remoteok?.tags ?? [],
                limit: 50,
              },
            }),
        });
      }
      if (!config?.weworkremotely?.enabled) {
        recommendations.push({
          board: "WeWorkRemotely",
          reason: "Useful for remote tech and product roles",
          enable: () =>
            setConfig({
              ...config!,
              weworkremotely: {
                ...config?.weworkremotely,
                enabled: true,
                limit: 50,
              },
            }),
        });
      }
    }

    // Startup keywords
    if (
      keywords.some(
        (k) =>
          k.includes("startup") ||
          k.includes("early stage") ||
          k.includes("seed"),
      )
    ) {
      if (!config?.yc_startup?.enabled) {
        recommendations.push({
          board: "YC Startups",
          reason: "You're interested in startups",
          enable: () =>
            setConfig({
              ...config!,
              yc_startup: {
                ...config?.yc_startup,
                enabled: true,
                remote_only: false,
                limit: 50,
              },
            }),
        });
      }
    }

    // Software/product/data/security keywords
    if (isTechFocused) {
      if (!config?.hn_hiring?.enabled) {
        recommendations.push({
          board: "Hacker News Who's Hiring",
          reason: "Active monthly tech hiring threads",
          enable: () =>
            setConfig({
              ...config!,
              hn_hiring: {
                ...config?.hn_hiring,
                enabled: true,
                remote_only: false,
                limit: 50,
              },
            }),
        });
      }
      if (!config?.dice?.enabled) {
        recommendations.push({
          board: "Dice",
          reason: "Technology roles",
          enable: () =>
            setConfig({
              ...config!,
              dice: { ...config?.dice, enabled: true, query: "", limit: 50 },
            }),
        });
      }
    }

    // Government/Federal keywords
    if (
      keywords.some(
        (k) =>
          k.includes("federal") ||
          k.includes("government") ||
          k.includes("clearance") ||
          k.includes("public sector"),
      )
    ) {
      if (!config?.usajobs?.enabled) {
        recommendations.push({
          board: "USAJobs",
          reason: "You're interested in government roles",
          enable: () =>
            setConfig({
              ...config!,
              usajobs: {
                ...config?.usajobs,
                enabled: true,
                email: config?.usajobs?.email ?? "",
                remote_only: false,
                date_posted_days: 30,
                limit: 100,
              },
            }),
        });
      }
    }

    // If they have US cities and a tech-focused search, suggest BuiltIn
    if (
      isTechFocused &&
      cities.some(
        (c) =>
          c.toLowerCase().includes("san francisco") ||
          c.toLowerCase().includes("new york") ||
          c.toLowerCase().includes("austin") ||
          c.toLowerCase().includes("seattle") ||
          c.toLowerCase().includes("chicago"),
      )
    ) {
      if (!config?.builtin?.enabled) {
        recommendations.push({
          board: "BuiltIn",
          reason: "Tech and startup jobs near " + cities[0],
          enable: () =>
            setConfig({
              ...config!,
              builtin: {
                ...config?.builtin,
                enabled: true,
                cities: config?.builtin?.cities ?? [],
                limit: 50,
              },
            }),
        });
      }
    }

    return recommendations.slice(0, 3); // Show max 3 recommendations
  }, [config]);

  const jobsWithGptPayload = useMemo(
    () => (config ? buildJobsWithGptPayload(config) : null),
    [config],
  );
  const jobsWithGptPayloadApproved = useMemo(
    () =>
      config
        ? isCurrentJobsWithGptPayloadApproved(config, jobsWithGptPayload)
        : false,
    [config, jobsWithGptPayload],
  );
  const hasJobsWithGptEndpoint = Boolean(
    config?.jobswithgpt_endpoint?.trim(),
  );
  const hasJobsWithGptTitles = Boolean(
    config?.title_allowlist.some((title) => title.trim().length > 0),
  );

  const approveJobsWithGptPayload = useCallback(() => {
    if (!config || !jobsWithGptPayload) return;

    setConfig({
      ...config,
      jobswithgpt_approval: {
        enabled: true,
        payload: jobsWithGptPayload,
        approved_at: new Date().toISOString(),
      },
    });
  }, [config, jobsWithGptPayload]);

  const clearJobsWithGptApproval = useCallback(() => {
    if (!config) return;

    setConfig({
      ...config,
      jobswithgpt_approval: {
        enabled: false,
        payload: null,
        approved_at: null,
      },
    });
  }, [config]);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);

      // Load config (non-sensitive settings)
      const configData = await invoke<Config>("get_config");
      setConfig({
        ...configData,
        jobswithgpt_endpoint: configData.jobswithgpt_endpoint ?? "",
        jobswithgpt_approval: configData.jobswithgpt_approval ?? {
          enabled: false,
          payload: null,
          approved_at: null,
        },
        linkedin: {
          ...configData.linkedin,
          enabled: false,
        },
      });

      try {
        const lastRequest = await invoke<SourceRequestSummary | null>(
          "get_latest_source_request",
          { source: "jobswithgpt" },
        );
        setJobsWithGptLastRequest(lastRequest);
      } catch (error) {
        logError("Could not load source request history:", error);
        setJobsWithGptLastRequest(null);
      }

      // Check which credentials exist in secure storage (don't load actual values)
      // Use allSettled so a single keyring failure doesn't block the entire Settings page
      const credentialKeys: CredentialKey[] = [
        "slack_webhook",
        "smtp_password",
        "discord_webhook",
        "teams_webhook",
        "telegram_bot_token",
        "usajobs_api_key",
      ];
      const credResults = await Promise.allSettled(
        credentialKeys.map((key) => hasCredential(key)),
      );

      const newStatus = {} as Record<CredentialKey, boolean>;
      let credFailures = 0;
      credentialKeys.forEach((key, i) => {
        const result = credResults[i];
        if (result?.status === "fulfilled") {
          newStatus[key] = result.value;
        } else {
          newStatus[key] = false;
          credFailures++;
        }
      });
      setCredentialStatus(newStatus);

      if (credFailures > 0) {
        toast.warning(
          "Some saved connection details unavailable",
          `Couldn't check ${credFailures} saved connection detail(s). Unlock your system password manager if needed.`,
        );
      }

    } catch (error: unknown) {
      logError("Failed to load config:", error);
      const friendly = getUserFriendlyError(error);
      toast.error(friendly.title, friendly.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadGhostConfig = useCallback(async () => {
    try {
      setGhostConfigLoading(true);
      const config = await invoke<GhostConfig>("get_ghost_config");
      setGhostConfig(config);
    } catch (error: unknown) {
      logError("Failed to load ghost config:", error);
      // Use default values if loading fails, but tell the user
      setGhostConfig({
        stale_threshold_days: 60,
        repost_threshold: 3,
        min_description_length: 200,
        penalize_missing_salary: false,
        warning_threshold: 0.3,
        hide_threshold: 0.7,
      });
      toast.warning(
        "Posting risk defaults loaded",
        "Couldn't load your saved posting-risk settings. Using defaults.",
      );
    } finally {
      setGhostConfigLoading(false);
    }
  }, [toast]);

  const handleDetectLocation = useCallback(async () => {
    setIsDetectingLocation(true);
    try {
      const location = await invoke<LocationInfo>("detect_location");
      setDetectedLocation(location);
      cacheDetectedLocation(location);
    } catch {
      toast.warning("Location unavailable", "Enter a city manually.");
    } finally {
      setIsDetectingLocation(false);
    }
  }, [toast]);

  useEffect(() => {
    loadConfig();
    loadGhostConfig();
  }, [loadConfig, loadGhostConfig]);

  const handleSave = useCallback(async () => {
    if (!config) return;

    const credentialValidationError = getCredentialValidationError(
      credentials,
      config,
      credentialStatus,
    );
    if (credentialValidationError) {
      toast.error(
        credentialValidationError.title,
        credentialValidationError.message,
      );
      return;
    }

    try {
      setSaving(true);

      // Save credentials to secure storage (only if user entered new values)
      const credentialSaves: Promise<void>[] = [];

      if (credentials.slack_webhook) {
        credentialSaves.push(
          storeCredential("slack_webhook", credentials.slack_webhook),
        );
      }
      if (credentials.smtp_password) {
        credentialSaves.push(
          storeCredential("smtp_password", credentials.smtp_password),
        );
      }
      if (credentials.discord_webhook) {
        credentialSaves.push(
          storeCredential("discord_webhook", credentials.discord_webhook),
        );
      }
      if (credentials.teams_webhook) {
        credentialSaves.push(
          storeCredential("teams_webhook", credentials.teams_webhook),
        );
      }
      if (credentials.telegram_bot_token) {
        credentialSaves.push(
          storeCredential("telegram_bot_token", credentials.telegram_bot_token),
        );
      }
      if (credentials.usajobs_api_key) {
        credentialSaves.push(
          storeCredential("usajobs_api_key", credentials.usajobs_api_key),
        );
      }

      const configSave = invoke("save_config", { config });
      const results = await Promise.allSettled([...credentialSaves, configSave]);
      const credentialResults = results.slice(0, credentialSaves.length);
      const configResult = results[credentialSaves.length];

      const credentialFailures = credentialResults.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      );
      const configFailure =
        configResult?.status === "rejected" ? configResult : null;

      if (configFailure) {
        logError("Settings config save failed:", configFailure.reason);
        if (credentialFailures.length > 0) {
          logError(
            "Credential save failures:",
            credentialFailures.map((f) => f.reason),
          );
        }
        toast.error(
          "Could not save settings",
          credentialFailures.length > 0
            ? "Settings and some saved connection details could not be saved. Try saving again."
            : "Settings could not be saved. Try saving again.",
        );
        return;
      }

      if (credentialFailures.length > 0) {
        logError(
          "Credential save failures:",
          credentialFailures.map((f) => f.reason),
        );
        toast.warning(
          "Some connection details were not saved",
          `${credentialFailures.length} saved connection detail(s) were not saved. Settings were saved. Try saving again.`,
        );
      } else {
        toast.success(
          "Settings saved!",
          "Saved connection details are stored in your system password manager.",
        );
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }, [config, credentialStatus, credentials, toast, onClose]);

  // Keyboard shortcut: Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!saving && config) {
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saving, config, handleSave]);

  const handleExportConfig = () => {
    if (!config) return;
    try {
      exportConfigToJSON(config);
      toast.success(
        "Private settings backup saved",
        "Saved passwords and connection codes are left out. This backup can still include search, pay, location, company, and alert settings.",
      );
    } catch (error: unknown) {
      logError("Failed to export config:", error);
      const friendly = getUserFriendlyError(error);
      toast.error(friendly.title, friendly.message);
    }
  };

  const handleImportConfig = async () => {
    try {
      const result = await importConfigFromJSON<unknown>();
      if (result.status === "cancelled") {
        return; // User cancelled
      }
      if (result.status === "invalid") {
        toast.error(
          "Could not read settings backup",
          "Choose another JobSentinel settings backup file.",
        );
        return;
      }
      if (!isSettingsBackupConfig(result.config)) {
        toast.error(
          "That is not a JobSentinel settings backup",
          "Choose a settings backup created from JobSentinel Settings.",
        );
        return;
      }

      // Connection secrets stay in OS secure storage, not in backup files.
      setConfig(result.config);
      toast.success(
        "Settings restored",
        "Review settings and use Save. Saved connection details are not included in backups, so add them again if needed.",
      );
    } catch (error: unknown) {
      logError("Failed to restore settings backup:", error);
      toast.error(
        "Could not restore settings",
        "Choose another JobSentinel settings backup file.",
      );
    }
  };

  const handleWebhookAlertToggle = (
    channel: "discord" | "teams",
    label: "Discord" | "Teams",
    credentialKey: "discord_webhook" | "teams_webhook",
    value: string,
    validator: (value: string) => boolean,
    enabled: boolean,
  ) => {
    if (!config) return;

    const trimmed = value.trim();
    if (enabled && !credentialStatus[credentialKey] && !trimmed) {
      toast.info(
        `Paste ${label} connection link first`,
        `Then turn ${label} alerts on.`,
      );
      return;
    }
    if (enabled && trimmed && !validator(trimmed)) {
      toast.error(
        `Check ${label} connection link`,
        `Paste the full ${label} connection link, then turn alerts on.`,
      );
      return;
    }

    setConfig({
      ...config,
      alerts: {
        ...config.alerts,
        [channel]: {
          ...config.alerts[channel],
          enabled,
        },
      },
    });
  };

  const handleTelegramAlertToggle = (enabled: boolean) => {
    if (!config) return;

    const alertCode = credentials.telegram_bot_token.trim();
    const destination = config.alerts.telegram?.chat_id?.trim() ?? "";
    if (
      enabled &&
      ((!credentialStatus.telegram_bot_token && !alertCode) || !destination)
    ) {
      toast.info(
        "Telegram setup opened",
        "Add the alert code and destination number before saving alerts.",
      );
    }

    setConfig({
      ...config,
      alerts: {
        ...config.alerts,
        telegram: {
          ...config.alerts.telegram,
          enabled,
        },
      },
    });
  };

  const handleAddTitle = () => {
    if (!config) return;
    const trimmed = titleInput.trim();
    if (trimmed && !config.title_allowlist.includes(trimmed)) {
      setConfig({
        ...config,
        title_allowlist: [...config.title_allowlist, trimmed],
      });
      setTitleInput("");
    }
  };

  const handleRemoveTitle = (title: string) => {
    if (!config) return;
    setConfig({
      ...config,
      title_allowlist: config.title_allowlist.filter((t) => t !== title),
    });
  };

  const handleAddSkill = () => {
    if (!config) return;
    const trimmed = skillInput.trim();
    if (trimmed && !config.keywords_boost.includes(trimmed)) {
      setConfig({
        ...config,
        keywords_boost: [...config.keywords_boost, trimmed],
      });
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    if (!config) return;
    setConfig({
      ...config,
      keywords_boost: config.keywords_boost.filter((s) => s !== skill),
    });
  };

  const handleAddCity = () => {
    if (!config) return;
    const trimmed = cityInput.trim();
    if (trimmed && !config.location_preferences.cities.includes(trimmed)) {
      setConfig({
        ...config,
        location_preferences: {
          ...config.location_preferences,
          cities: [...config.location_preferences.cities, trimmed],
        },
      });
      setCityInput("");
    }
  };

  const handleRemoveCity = (city: string) => {
    if (!config) return;
    setConfig({
      ...config,
      location_preferences: {
        ...config.location_preferences,
        cities: config.location_preferences.cities.filter((c) => c !== city),
      },
    });
  };

  // Blocked title handlers
  const handleAddBlockedTitle = () => {
    if (!config) return;
    const trimmed = blockedTitleInput.trim();
    if (trimmed && !config.title_blocklist.includes(trimmed)) {
      setConfig({
        ...config,
        title_blocklist: [...config.title_blocklist, trimmed],
      });
      setBlockedTitleInput("");
    }
  };

  const handleRemoveBlockedTitle = (title: string) => {
    if (!config) return;
    setConfig({
      ...config,
      title_blocklist: config.title_blocklist.filter((t) => t !== title),
    });
  };

  // Exclude keyword handlers
  const handleAddExcludeKeyword = () => {
    if (!config) return;
    const trimmed = excludeKeywordInput.trim();
    if (trimmed && !config.keywords_exclude.includes(trimmed)) {
      setConfig({
        ...config,
        keywords_exclude: [...config.keywords_exclude, trimmed],
      });
      setExcludeKeywordInput("");
    }
  };

  const handleRemoveExcludeKeyword = (keyword: string) => {
    if (!config) return;
    setConfig({
      ...config,
      keywords_exclude: config.keywords_exclude.filter((k) => k !== keyword),
    });
  };

  // Company whitelist handlers
  const handleAddWhitelistCompany = () => {
    if (!config) return;
    const trimmed = whitelistCompanyInput.trim();
    if (trimmed && !config.company_whitelist.includes(trimmed)) {
      setConfig({
        ...config,
        company_whitelist: [...config.company_whitelist, trimmed],
      });
      setWhitelistCompanyInput("");
    }
  };

  const handleRemoveWhitelistCompany = (company: string) => {
    if (!config) return;
    setConfig({
      ...config,
      company_whitelist: config.company_whitelist.filter((c) => c !== company),
    });
  };

  // Company blacklist handlers
  const handleAddBlacklistCompany = () => {
    if (!config) return;
    const trimmed = blacklistCompanyInput.trim();
    if (trimmed && !config.company_blacklist.includes(trimmed)) {
      setConfig({
        ...config,
        company_blacklist: [...config.company_blacklist, trimmed],
      });
      setBlacklistCompanyInput("");
    }
  };

  const handleRemoveBlacklistCompany = (company: string) => {
    if (!config) return;
    setConfig({
      ...config,
      company_blacklist: config.company_blacklist.filter((c) => c !== company),
    });
  };

  const handleSaveGhostConfig = async () => {
    if (!ghostConfig) return;

    try {
      setGhostConfigLoading(true);
      await invoke("set_ghost_config", { config: ghostConfig });
      toast.success(
        "Posting risk settings saved",
        "New job checks use these warnings.",
      );
    } catch (error: unknown) {
      logError("Failed to save ghost config:", error);
      const friendly = getUserFriendlyError(error);
      toast.error(friendly.title, friendly.message);
    } finally {
      setGhostConfigLoading(false);
    }
  };

  const handleResetGhostConfig = async () => {
    try {
      setGhostConfigLoading(true);
      await invoke("reset_ghost_config");
      await loadGhostConfig();
      toast.success(
        "Posting risk defaults restored",
        "Balanced warnings are back on.",
      );
    } catch (error: unknown) {
      logError("Failed to reset ghost config:", error);
      const friendly = getUserFriendlyError(error);
      toast.error(friendly.title, friendly.message);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div
            className="flex items-center justify-center py-12"
            role="status"
            aria-label="Loading settings"
          >
            <div
              className="animate-spin w-8 h-8 border-4 border-sentinel-500 border-t-transparent rounded-full"
              aria-hidden="true"
            />
            <span className="sr-only">Loading settings...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-sm text-red-500 dark:text-red-400 text-center max-w-md">
              Settings could not load. Try again. If this keeps happening,
              save a safe support report from Help before closing and reopening
              JobSentinel.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => void loadConfig()}
                className="px-4 py-2 text-sm rounded bg-sentinel-500 text-white hover:bg-sentinel-600"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-600"
              >
                Close
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const isValidFromEmail = isValidEmail(config.alerts.email?.from_email ?? "");
  const hasValidToEmails = (config.alerts.email?.to_emails ?? []).every(
    isValidEmail,
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-surface-800">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-lg flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-sentinel-600 dark:text-sentinel-400" />
              </div>
              <div>
                <h2
                  id="settings-title"
                  className="font-display text-display-lg text-surface-900 dark:text-white"
                >
                  Settings
                </h2>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Update your job search preferences
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              aria-label="Close settings"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Tab Navigation */}
          <div
            role="tablist"
            aria-label="Settings tabs"
            className="flex border-b border-surface-200 dark:border-surface-700 mb-6"
          >
            <button
              role="tab"
              aria-selected={activeTab === "basic"}
              aria-controls="basic-settings-panel"
              id="basic-settings-tab"
              onClick={() => setActiveTab("basic")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "basic"
                  ? "border-sentinel-500 text-sentinel-600 dark:text-sentinel-400"
                  : "border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              }`}
            >
              Basic Settings
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "advanced"}
              aria-controls="advanced-settings-panel"
              id="advanced-settings-tab"
              onClick={() => setActiveTab("advanced")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "advanced"
                  ? "border-sentinel-500 text-sentinel-600 dark:text-sentinel-400"
                  : "border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              }`}
            >
              More Settings
            </button>
          </div>

          {/* BASIC SETTINGS TAB */}
          {activeTab === "basic" && (
            <div
              role="tabpanel"
              id="basic-settings-panel"
              aria-labelledby="basic-settings-tab"
            >
              {/* Job Titles */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Job Titles You Want
                  <HelpIcon text="Jobs with these titles will appear in your feed. Add titles like 'Marketing Manager' or 'SEO Specialist'." />
                </h3>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a job title..."
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTitle();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddTitle}
                    disabled={!titleInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.title_allowlist.map((title) => (
                    <Badge
                      key={title}
                      variant="sentinel"
                      removable
                      onRemove={() => handleRemoveTitle(title)}
                    >
                      {title}
                    </Badge>
                  ))}
                  {config.title_allowlist.length === 0 && (
                    <p className="text-sm text-surface-400">
                      No job titles added
                    </p>
                  )}
                </div>
              </section>

              {/* Blocked Job Titles */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Job Titles to Avoid
                  <HelpIcon text="Jobs with these titles will be filtered out. Use this for titles like 'Intern' or 'Entry Level' if you're looking for senior roles." />
                </h3>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a title to block..."
                    value={blockedTitleInput}
                    onChange={(e) => setBlockedTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddBlockedTitle();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddBlockedTitle}
                    disabled={!blockedTitleInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.title_blocklist.map((title) => (
                    <Badge
                      key={title}
                      variant="danger"
                      removable
                      onRemove={() => handleRemoveBlockedTitle(title)}
                    >
                      {title}
                    </Badge>
                  ))}
                  {config.title_blocklist.length === 0 && (
                    <p className="text-sm text-surface-400">
                      No blocked titles
                    </p>
                  )}
                </div>
              </section>

              {/* Skills */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Your Skills
                  <HelpIcon text="Jobs that mention these skills will rank higher. Add skills from your resume like 'Project Management', 'Customer Service', or 'Scheduling'." />
                </h3>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a skill..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddSkill}
                    disabled={!skillInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.keywords_boost.map((skill) => (
                    <Badge
                      key={skill}
                      variant="alert"
                      removable
                      onRemove={() => handleRemoveSkill(skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                  {config.keywords_boost.length === 0 && (
                    <p className="text-sm text-surface-400">No skills added</p>
                  )}
                </div>
              </section>

              {/* Search words to avoid */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Search Words to Avoid
                  <HelpIcon text="Jobs mentioning these words will rank lower. Use this for work you do not want, like 'Sales' or 'Travel Required'." />
                </h3>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a word or phrase to avoid..."
                    value={excludeKeywordInput}
                    onChange={(e) => setExcludeKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddExcludeKeyword();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddExcludeKeyword}
                    disabled={!excludeKeywordInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.keywords_exclude.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="danger"
                      removable
                      onRemove={() => handleRemoveExcludeKeyword(keyword)}
                    >
                      {keyword}
                    </Badge>
                  ))}
                  {config.keywords_exclude.length === 0 && (
                    <p className="text-sm text-surface-400">
                      No search words to avoid
                    </p>
                  )}
                </div>
              </section>

              {/* Location */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Where You Want to Work
                  <HelpIcon text="Choose your work style preferences. If you select hybrid or on-site, you can add specific cities." />
                </h3>
                <div className="space-y-2 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.location_preferences.allow_remote}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          location_preferences: {
                            ...config.location_preferences,
                            allow_remote: e.target.checked,
                          },
                        })
                      }
                      className="w-5 h-5 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                    />
                    <span className="text-surface-700 dark:text-surface-300">
                      Remote
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.location_preferences.allow_hybrid}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          location_preferences: {
                            ...config.location_preferences,
                            allow_hybrid: e.target.checked,
                          },
                        })
                      }
                      className="w-5 h-5 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                    />
                    <span className="text-surface-700 dark:text-surface-300">
                      Hybrid
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.location_preferences.allow_onsite}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          location_preferences: {
                            ...config.location_preferences,
                            allow_onsite: e.target.checked,
                          },
                        })
                      }
                      className="w-5 h-5 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                    />
                    <span className="text-surface-700 dark:text-surface-300">
                      On-site
                    </span>
                  </label>
                </div>

                {(config.location_preferences.allow_hybrid ||
                  config.location_preferences.allow_onsite) && (
                  <>
                    {/* Detected location indicator */}
                    {detectedLocation && (
                      <div className="mb-3 p-3 bg-sentinel-50 dark:bg-sentinel-950 border border-sentinel-200 dark:border-sentinel-800 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                              />
                            </svg>
                            <span className="text-sm text-sentinel-700 dark:text-sentinel-300">
                              Detected:{" "}
                              <strong>
                                {detectedLocation.city},{" "}
                                {detectedLocation.region}
                              </strong>
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const locationStr = `${detectedLocation.city}, ${detectedLocation.region}`;
                              if (
                                !config.location_preferences.cities.includes(
                                  locationStr,
                                )
                              ) {
                                setConfig({
                                  ...config,
                                  location_preferences: {
                                    ...config.location_preferences,
                                    cities: [
                                      ...config.location_preferences.cities,
                                      locationStr,
                                    ],
                                  },
                                });
                                toast.success(
                                  "Location added",
                                  `Added ${locationStr}`,
                                );
                              }
                            }}
                            disabled={config.location_preferences.cities.includes(
                              `${detectedLocation.city}, ${detectedLocation.region}`,
                            )}
                          >
                            {config.location_preferences.cities.includes(
                              `${detectedLocation.city}, ${detectedLocation.region}`,
                            )
                              ? "Added"
                              : "Use This"}
                          </Button>
                        </div>
                      </div>
                    )}
                    {!detectedLocation && (
                      <div className="mb-3 p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleDetectLocation}
                            loading={isDetectingLocation}
                            loadingText="Detecting..."
                            aria-describedby="settings-location-detection-privacy"
                            icon={
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                                />
                              </svg>
                            }
                          >
                            Detect location
                          </Button>
                        </div>
                        <p
                        id="settings-location-detection-privacy"
                        className="mt-2 text-xs text-surface-500 dark:text-surface-400"
                      >
                          Only when you use this button, JobSentinel asks an outside
                          location lookup service for your approximate city
                          from your internet address. Nothing is saved unless
                          you add the city.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="Add a city..."
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCity();
                          }
                        }}
                      />
                      <Button
                        onClick={handleAddCity}
                        disabled={!cityInput.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {config.location_preferences.cities.map((city) => (
                        <Badge
                          key={city}
                          variant="surface"
                          removable
                          onRemove={() => handleRemoveCity(city)}
                        >
                          {city}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* Salary */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Salary Preferences
                  <HelpIcon text="Set your minimum and target salary. Job matches show whether listed pay is close to your target." />
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Minimum Acceptable Salary
                    </label>
                    <Input
                      type="number"
                      value={config.salary_floor_usd || ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          salary_floor_usd: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="e.g., 60000"
                      hint="The lowest salary you'd consider"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Target Salary
                    </label>
                    <Input
                      type="number"
                      value={config.salary_target_usd || ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          salary_target_usd:
                            parseInt(e.target.value) || undefined,
                        })
                      }
                      placeholder="e.g., 100000"
                      hint="Your ideal salary - jobs at or above this show stronger pay fit"
                    />
                  </div>
                </div>
              </section>

              {/* Company Preferences */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Company Preferences
                  <HelpIcon text="Add companies you love (they'll rank higher) or companies you want to avoid (they'll rank lower)." />
                </h3>
                <div className="space-y-4">
                  {/* Preferred Companies */}
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Preferred Companies
                    </label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add a company you'd love to work for..."
                        value={whitelistCompanyInput}
                        onChange={(e) =>
                          setWhitelistCompanyInput(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddWhitelistCompany();
                          }
                        }}
                      />
                      <Button
                        onClick={handleAddWhitelistCompany}
                        disabled={!whitelistCompanyInput.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {config.company_whitelist?.map((company) => (
                        <Badge
                          key={company}
                          variant="sentinel"
                          removable
                          onRemove={() => handleRemoveWhitelistCompany(company)}
                        >
                          {company}
                        </Badge>
                      ))}
                      {(!config.company_whitelist ||
                        config.company_whitelist.length === 0) && (
                        <p className="text-sm text-surface-400">
                          No preferred companies
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Blocked Companies */}
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Companies to Avoid
                    </label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add a company you don't want to see..."
                        value={blacklistCompanyInput}
                        onChange={(e) =>
                          setBlacklistCompanyInput(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddBlacklistCompany();
                          }
                        }}
                      />
                      <Button
                        onClick={handleAddBlacklistCompany}
                        disabled={!blacklistCompanyInput.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {config.company_blacklist?.map((company) => (
                        <Badge
                          key={company}
                          variant="danger"
                          removable
                          onRemove={() => handleRemoveBlacklistCompany(company)}
                        >
                          {company}
                        </Badge>
                      ))}
                      {(!config.company_blacklist ||
                        config.company_blacklist.length === 0) && (
                        <p className="text-sm text-surface-400">
                          No blocked companies
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Auto-Refresh */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Auto-Search
                  <HelpIcon text="Turn this on to check for new postings while JobSentinel is open." />
                </h3>
                <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <RefreshIcon className="w-5 h-5 text-sentinel-500" />
                      <span className="font-medium text-surface-800 dark:text-surface-200">
                        Check selected job sites on schedule
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.auto_refresh?.enabled ?? false}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            auto_refresh: {
                              ...config.auto_refresh,
                              enabled: e.target.checked,
                              interval_minutes:
                                config.auto_refresh?.interval_minutes ?? 30,
                            },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                    </label>
                  </div>

                  {config.auto_refresh?.enabled && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-surface-700 dark:text-surface-300">
                          Refresh every:
                        </label>
                        <select
                          value={config.auto_refresh?.interval_minutes ?? 30}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              auto_refresh: {
                                ...config.auto_refresh,
                                enabled: true,
                                interval_minutes: parseInt(e.target.value),
                              },
                            })
                          }
                          className="px-3 py-1.5 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                        >
                          <option value="5">5 minutes</option>
                          <option value="10">10 minutes</option>
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                          <option value="60">1 hour</option>
                          <option value="120">2 hours</option>
                        </select>
                      </div>
                      <p className="text-xs text-surface-500 dark:text-surface-400">
                        JobSentinel checks for new jobs at this interval while
                        the app is open.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ADVANCED SETTINGS TAB */}
          {activeTab === "advanced" && (
            <div
              role="tabpanel"
              id="advanced-settings-panel"
              aria-labelledby="advanced-settings-tab"
            >
              {/* Notifications */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Get Notified
                  <HelpIcon text="Receive alerts when new jobs match your criteria. Desktop alerts are the easiest option; email and chat alerts are optional." />
                </h3>
                <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">
                  Start with desktop alerts if you want the simplest setup.
                  Email gives you an inbox copy. Chat alerts are optional for
                  people who already use those tools.
                </p>
                <p className="mb-4 rounded-lg border border-surface-200 bg-surface-50 p-3 text-xs text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300">
                  Email and chat alerts are sent through the service you choose.
                  They can include job title, company, location, pay, remote
                  status, match label, source, and job link. Resume text,
                  private notes, application history, and local match reasons
                  stay in JobSentinel.
                </p>

                {/* Desktop Notifications */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
                    Desktop Notifications
                    <HelpIcon
                      text="Get desktop alerts from your computer when new jobs match your criteria. No extra account or connection link required."
                      position="right"
                    />
                  </label>
                  <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                    <p className="mb-3 text-xs text-surface-500 dark:text-surface-400">
                      Desktop alerts use private wording. They do not show job
                      titles, company names, salary notes, or reminder text.
                    </p>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <SettingsSymbol icon="bell" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                        <span className="text-sm text-surface-600 dark:text-surface-300">
                          Desktop alerts
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          aria-label="Enable desktop alerts"
                          checked={config.alerts.desktop?.enabled ?? true}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              alerts: {
                                ...config.alerts,
                                desktop: {
                                  ...config.alerts.desktop,
                                  enabled: e.target.checked,
                                  show_when_focused:
                                    config.alerts.desktop?.show_when_focused ??
                                    false,
                                  play_sound:
                                    config.alerts.desktop?.play_sound ?? true,
                                },
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                      </label>
                    </div>
                    {config.alerts.desktop?.enabled && (
                      <div className="space-y-2 pt-2 border-t border-surface-200 dark:border-surface-700">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.alerts.desktop?.play_sound ?? true}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                alerts: {
                                  ...config.alerts,
                                  desktop: {
                                    ...config.alerts.desktop,
                                    enabled: true,
                                    play_sound: e.target.checked,
                                    show_when_focused:
                                      config.alerts.desktop
                                        ?.show_when_focused ?? false,
                                  },
                                },
                              })
                            }
                            className="w-4 h-4 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                          />
                          <span className="text-sm text-surface-600 dark:text-surface-300">
                            Play sound
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              config.alerts.desktop?.show_when_focused ?? false
                            }
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                alerts: {
                                  ...config.alerts,
                                  desktop: {
                                    ...config.alerts.desktop,
                                    enabled: true,
                                    show_when_focused: e.target.checked,
                                    play_sound:
                                      config.alerts.desktop?.play_sound ?? true,
                                  },
                                },
                              })
                            }
                            className="w-4 h-4 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                          />
                          <span className="text-sm text-surface-600 dark:text-surface-300">
                            Show even when JobSentinel is open on screen
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <EmailIcon className="w-5 h-5 text-blue-500" />
                      <span className="font-medium text-surface-800 dark:text-surface-200">
                        Email Alerts
                      </span>
                      <HelpIcon text="Email alerts are optional. Leave this off unless your email provider gives you an app password or sending settings." />
                    </div>
                    <label
                      className="relative inline-flex items-center cursor-pointer"
                      data-testid="email-alerts-toggle"
                    >
                      <input
                        type="checkbox"
                        aria-label="Enable email alerts"
                        checked={config.alerts.email?.enabled ?? false}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            alerts: {
                              ...config.alerts,
                              email: {
                                ...config.alerts.email,
                                enabled: e.target.checked,
                              },
                            },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                    </label>
                  </div>

                  {config.alerts.email?.enabled && (
                    <div className="space-y-3">
                      {/* Email Provider Quick Setup */}
                      <div className="flex items-center gap-2 -mt-1 mb-2">
                        <span className="text-sm text-surface-600 dark:text-surface-400">
                          Optional setup:
                        </span>
                        <div className="flex gap-1">
                          {(
                            ["gmail", "outlook", "yahoo", "custom"] as const
                          ).map((provider) => (
                            <button
                              key={provider}
                              type="button"
                              onClick={() => applyEmailProvider(provider)}
                              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                emailProvider === provider
                                  ? "bg-sentinel-500 text-white"
                                  : "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600"
                              }`}
                            >
                              {provider === "gmail"
                                ? "Gmail"
                                : provider === "outlook"
                                  ? "Outlook"
                                  : provider === "yahoo"
                                    ? "Yahoo"
                                    : "Other"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-surface-500 dark:text-surface-400 -mt-1">
                        {emailProviderTemplates[emailProvider].hint}
                        {emailProvider === "gmail" && (
                          <>
                            {" "}
                            —{" "}
                            <a
                              href="https://myaccount.google.com/apppasswords"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sentinel-500 hover:underline"
                            >
                              Create App Password
                            </a>
                          </>
                        )}
                        {emailProvider === "yahoo" && (
                          <>
                            {" "}
                            —{" "}
                            <a
                              href="https://login.yahoo.com/account/security"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sentinel-500 hover:underline"
                            >
                              Yahoo Security Settings
                            </a>
                          </>
                        )}
                      </p>
                      <div className="flex items-center justify-between -mt-1 mb-3">
                        <span></span>
                        {config.alerts.email?.smtp_server &&
                          config.alerts.email?.smtp_username &&
                          (credentials.smtp_password ||
                            credentialStatus.smtp_password) &&
                          config.alerts.email?.from_email &&
                          isValidFromEmail &&
                          config.alerts.email?.to_emails?.length > 0 &&
                          hasValidToEmails && (
                            <Button
                              variant="secondary"
                              disabled={testingEmail}
                              onClick={async () => {
                                setTestingEmail(true);
                                try {
                                  if (
                                    !credentials.smtp_password &&
                                    !credentialStatus.smtp_password
                                  ) {
                                    toast.error(
                                      "App password needed",
                                      "Enter the app password from your email provider.",
                                    );
                                    return;
                                  }
                                  await invoke("test_email_notification", {
                                    emailConfig: {
                                      smtp_server:
                                        config.alerts.email.smtp_server,
                                      smtp_port: config.alerts.email.smtp_port,
                                      smtp_username:
                                        config.alerts.email.smtp_username,
                                      smtp_password: credentials.smtp_password,
                                      from_email:
                                        config.alerts.email.from_email,
                                      to_emails: config.alerts.email.to_emails,
                                      use_starttls:
                                        config.alerts.email.use_starttls ??
                                        true,
                                    },
                                  });
                                  toast.success(
                                    "Test sent!",
                                    "Check your email inbox",
                                  );
                                } catch {
                                  toast.error(
                                    "Could not send test",
                                    "Check the email account, app password, and recipient addresses.",
                                  );
                                } finally {
                                  setTestingEmail(false);
                                }
                              }}
                              className="whitespace-nowrap"
                            >
                              {testingEmail ? "Testing..." : "Test"}
                            </Button>
                          )}
                      </div>
                      <details className="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                        <summary className="cursor-pointer text-sm font-medium text-surface-700 dark:text-surface-300">
                          Email provider details
                        </summary>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <Input
                            label="Provider address"
                            value={config.alerts.email?.smtp_server ?? ""}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                alerts: {
                                  ...config.alerts,
                                  email: {
                                    ...config.alerts.email,
                                    smtp_server: e.target.value,
                                  },
                                },
                              })
                            }
                            placeholder="smtp.gmail.com"
                            hint="Use the email sending address from your email provider."
                          />
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Input
                                label="Provider number"
                                type="number"
                                value={config.alerts.email?.smtp_port ?? 587}
                                onChange={(e) =>
                                  setConfig({
                                    ...config,
                                    alerts: {
                                      ...config.alerts,
                                      email: {
                                        ...config.alerts.email,
                                        smtp_port:
                                          parseInt(e.target.value) || 587,
                                      },
                                    },
                                  })
                                }
                                hint="Use the email sending number from your email provider. Leave it alone unless your provider says otherwise."
                              />
                            </div>
                            <div className="flex items-end pb-2">
                              <div className="space-y-1">
                                <label
                                  className="flex items-center gap-2 cursor-pointer"
                                  title="Enable secure connection (recommended)"
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      config.alerts.email?.use_starttls ?? true
                                    }
                                    onChange={(e) =>
                                      setConfig({
                                        ...config,
                                        alerts: {
                                          ...config.alerts,
                                          email: {
                                            ...config.alerts.email,
                                            use_starttls: e.target.checked,
                                          },
                                        },
                                      })
                                    }
                                    className="w-4 h-4 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                                  />
                                  <span className="text-sm text-surface-700 dark:text-surface-300">
                                    Use secure email connection (recommended)
                                  </span>
                                </label>
                                <p className="text-xs text-surface-500 dark:text-surface-400">
                                  Leave this on unless your email provider says to turn it off.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </details>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Email address"
                          value={config.alerts.email?.smtp_username ?? ""}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              alerts: {
                                ...config.alerts,
                                email: {
                                  ...config.alerts.email,
                                  smtp_username: e.target.value,
                                },
                              },
                            })
                          }
                          placeholder="your@gmail.com"
                          hint="The email account to send from"
                          autoComplete="email"
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                              App Password
                            </span>
                            <SecurityBadge
                              stored={credentialStatus.smtp_password}
                            />
                          </div>
                          <Input
                            type="password"
                            value={credentials.smtp_password}
                            onChange={(e) =>
                              setCredentials((prev) => ({
                                ...prev,
                                smtp_password: e.target.value,
                              }))
                            }
                            placeholder={
                              credentialStatus.smtp_password
                                ? "Enter new app password to update"
                                : "App password from your email provider"
                            }
                            autoComplete="current-password"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Send From"
                          value={config.alerts.email?.from_email ?? ""}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              alerts: {
                                ...config.alerts,
                                email: {
                                  ...config.alerts.email,
                                  from_email: e.target.value,
                                },
                              },
                            })
                          }
                          placeholder="your@gmail.com"
                          hint="Usually same as your email address"
                          error={
                            !isValidFromEmail
                              ? "Use an email address like user@example.com."
                              : undefined
                          }
                          autoComplete="email"
                        />
                        <Input
                          label="Send To"
                          value={
                            config.alerts.email?.to_emails?.join(", ") ?? ""
                          }
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              alerts: {
                                ...config.alerts,
                                email: {
                                  ...config.alerts.email,
                                  to_emails: e.target.value
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                },
                              },
                            })
                          }
                          placeholder="you@email.com"
                          hint="Where to receive alerts (can be the same email)"
                          error={
                            !hasValidToEmails
                              ? "Use an email address like user@example.com."
                              : undefined
                          }
                          autoComplete="email"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    Optional chat alerts
                  </h4>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    Use these only if Slack, Discord, Teams, or Telegram are
                    already part of your routine.
                  </p>
                </div>

                {/* Slack */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
                    Slack Notifications
                    <HelpIcon
                      text="Get job alerts in a Slack channel. In Slack, add the app that creates channel connection links, choose a channel, then copy the link."
                      position="right"
                    />
                    <SecurityBadge stored={credentialStatus.slack_webhook} />
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="password"
                        value={credentials.slack_webhook}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCredentials((prev) => ({
                            ...prev,
                            slack_webhook: value,
                          }));
                          // Auto-enable Slack if valid connection link entered.
                          if (value && isValidSlackWebhook(value)) {
                            setConfig({
                              ...config,
                              alerts: {
                                ...config.alerts,
                                slack: { enabled: true },
                              },
                            });
                          }
                        }}
                        placeholder={
                          credentialStatus.slack_webhook
                            ? "Enter new Slack connection link"
                            : "Paste Slack connection link"
                        }
                        error={
                          credentials.slack_webhook &&
                          !isValidSlackWebhook(credentials.slack_webhook)
                            ? "This doesn't look like a Slack connection link"
                            : undefined
                        }
                        hint="Saved securely on this computer"
                        autoComplete="off"
                      />
                    </div>
                    {(credentials.slack_webhook ||
                      credentialStatus.slack_webhook) && (
                      <Button
                        variant="secondary"
                        disabled={testingSlack}
                        onClick={async () => {
                          setTestingSlack(true);
                          try {
                            if (
                              !credentials.slack_webhook &&
                              !credentialStatus.slack_webhook
                            ) {
                              toast.error(
                                "No Slack link",
                                "Paste a Slack connection link first.",
                              );
                              return;
                            }
                            await invoke("validate_slack_webhook", {
                              webhookUrl: credentials.slack_webhook,
                            });
                            toast.success(
                              "Test sent!",
                              "Check your Slack channel",
                            );
                          } catch {
                            toast.error(
                              "Could not send test",
                              "Check that the Slack connection link is correct and try again",
                            );
                          } finally {
                            setTestingSlack(false);
                          }
                        }}
                        className="whitespace-nowrap"
                      >
                        {testingSlack ? "Testing..." : "Test"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Discord */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
                    Discord Notifications
                    <HelpIcon
                      text="Get job alerts in a Discord channel. In Discord, create a channel connection link, then paste it here."
                      position="right"
                    />
                  </label>
                  <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SettingsSymbol icon="chat" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                        <span className="text-sm text-surface-600 dark:text-surface-300">
                          Send alerts to Discord
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          aria-label="Enable Discord alerts"
                          checked={config.alerts.discord?.enabled ?? false}
                          onChange={(e) =>
                            handleWebhookAlertToggle(
                              "discord",
                              "Discord",
                              "discord_webhook",
                              credentials.discord_webhook,
                              isValidDiscordWebhook,
                              e.target.checked,
                            )
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                      </label>
                    </div>
                    {(config.alerts.discord?.enabled ||
                      !credentialStatus.discord_webhook ||
                      credentials.discord_webhook) && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-surface-600 dark:text-surface-400">
                            Connection link
                          </span>
                          <SecurityBadge
                            stored={credentialStatus.discord_webhook}
                          />
                        </div>
                        <Input
                          type="password"
                          value={credentials.discord_webhook}
                          onChange={(e) =>
                            setCredentials((prev) => ({
                              ...prev,
                              discord_webhook: e.target.value,
                            }))
                          }
                          placeholder={
                            credentialStatus.discord_webhook
                              ? "Enter new Discord connection link"
                              : "Paste Discord connection link"
                          }
                          error={
                            credentials.discord_webhook &&
                            !isValidDiscordWebhook(
                              credentials.discord_webhook,
                            )
                              ? "This doesn't look like a Discord connection link"
                              : undefined
                          }
                          hint="Server Settings → Integrations → create a channel connection → Copy link"
                          autoComplete="off"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Microsoft Teams */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
                    Microsoft Teams Notifications
                    <HelpIcon
                      text="Get job alerts in a Teams channel. Create a channel connection link in Teams, then paste it here."
                      position="right"
                    />
                  </label>
                  <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SettingsSymbol icon="users" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                        <span className="text-sm text-surface-600 dark:text-surface-300">
                          Send alerts to Teams
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          aria-label="Enable Teams alerts"
                          checked={config.alerts.teams?.enabled ?? false}
                          onChange={(e) =>
                            handleWebhookAlertToggle(
                              "teams",
                              "Teams",
                              "teams_webhook",
                              credentials.teams_webhook,
                              isValidTeamsWebhook,
                              e.target.checked,
                            )
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                      </label>
                    </div>
                    {(config.alerts.teams?.enabled ||
                      !credentialStatus.teams_webhook ||
                      credentials.teams_webhook) && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-surface-600 dark:text-surface-400">
                            Connection link
                          </span>
                          <SecurityBadge
                            stored={credentialStatus.teams_webhook}
                          />
                        </div>
                        <Input
                          type="password"
                          value={credentials.teams_webhook}
                          onChange={(e) =>
                            setCredentials((prev) => ({
                              ...prev,
                              teams_webhook: e.target.value,
                            }))
                          }
                          placeholder={
                            credentialStatus.teams_webhook
                              ? "Enter new Teams connection link"
                              : "Paste Teams connection link"
                          }
                          error={
                            credentials.teams_webhook &&
                            !isValidTeamsWebhook(credentials.teams_webhook)
                              ? "This doesn't look like a Teams connection link"
                              : undefined
                          }
                          autoComplete="off"
                          hint="Channel → Connectors → create a channel connection → Copy link"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Telegram */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
                    Telegram Notifications
                    <Badge variant="surface" size="sm">Optional chat alert</Badge>
                    <HelpIcon
                      text="Use desktop or email alerts unless you already use Telegram for automatic alerts."
                      position="right"
                    />
                  </label>
                  <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                    <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">
                      Use desktop or email alerts unless you already use Telegram for automatic alerts.
                      Telegram needs an alert code and destination number from Telegram.
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SettingsSymbol icon="send" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                        <span className="text-sm text-surface-600 dark:text-surface-300">
                          Send alerts to Telegram
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          aria-label="Enable Telegram alerts"
                          checked={config.alerts.telegram?.enabled ?? false}
                          onChange={(e) =>
                            handleTelegramAlertToggle(e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                      </label>
                    </div>
                    {(config.alerts.telegram?.enabled ||
                      Boolean(credentials.telegram_bot_token) ||
                      (credentialStatus.telegram_bot_token &&
                        Boolean((config.alerts.telegram?.chat_id ?? "").trim()))) && (
                      <div className="mt-3 space-y-3">
                        <div className="p-3 bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700 rounded-lg">
                          <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                            Optional Telegram alert setup
                          </p>
                          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                            Continue only if you already use Telegram for automatic
                            alerts or want to create a private job-alert path.
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-surface-600 dark:text-surface-400">
                              Telegram alert code
                            </span>
                            <SecurityBadge
                              stored={credentialStatus.telegram_bot_token}
                            />
                          </div>
                          <Input
                            type="password"
                            value={credentials.telegram_bot_token}
                            onChange={(e) =>
                              setCredentials((prev) => ({
                                ...prev,
                                telegram_bot_token: e.target.value,
                              }))
                            }
                            placeholder={
                              credentialStatus.telegram_bot_token
                                ? "Enter new Telegram alert code"
                                : "Paste Telegram alert code"
                            }
                            hint="In Telegram, message @BotFather, send /newbot, then copy the code it gives you"
                          />
                        </div>
                        <div>
                          <span className="text-sm text-surface-600 dark:text-surface-400 mb-1 block">
                            Telegram destination number
                          </span>
                          <Input
                            placeholder="Numbers from @userinfobot"
                            value={config.alerts.telegram?.chat_id ?? ""}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                alerts: {
                                  ...config.alerts,
                                  telegram: {
                                    ...config.alerts.telegram,
                                    enabled: true,
                                    chat_id: e.target.value,
                                  },
                                },
                              })
                            }
                            hint="In Telegram, message @userinfobot and copy the ID it shows"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </section>

              {/* Notification Preferences by Source */}
              <section className="mb-6">
                <NotificationPreferences />
              </section>

              {/* Job Sources */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Additional Job Boards
                  <HelpIcon text="JobSentinel can check selected public job sites and company application pages. Turn on only sources you want JobSentinel to contact." />
                </h3>
                <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
                  JobSentinel can check public company career pages and selected job sites.
                  These are optional extras.
                </p>

                {/* LinkedIn */}
                <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <LinkedInIcon className="w-5 h-5 text-[#0077B5]" />
                      <span className="font-medium text-surface-800 dark:text-surface-200">
                        LinkedIn
                      </span>
                    </div>
                    <Badge variant="surface">Search links only</Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-surface-600 dark:text-surface-300">
                      JobSentinel does not log in to LinkedIn or monitor it in
                      the background. Use job-site search links when you want to
                      open LinkedIn yourself.
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                      For automatic checks, prefer official company pages and
                      public company application pages such as Greenhouse, Lever,
                      Ashby, SmartRecruiters, and USAJobs.
                    </p>
                  </div>
                </div>

                {/* USAJobs */}
                <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🇺🇸</span>
                      <span className="font-medium text-surface-800 dark:text-surface-200">
                        USAJobs
                      </span>
                      <span className="text-xs text-surface-500">
                        (Federal government jobs)
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        aria-label="Turn USAJobs automatic checks on or off"
                        checked={config.usajobs?.enabled ?? false}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            usajobs: {
                              ...config.usajobs,
                              enabled: e.target.checked,
                              email: config.usajobs?.email ?? "",
                              remote_only: config.usajobs?.remote_only ?? false,
                              date_posted_days:
                                config.usajobs?.date_posted_days ?? 30,
                              limit: config.usajobs?.limit ?? 100,
                            },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-200 peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sentinel-500"></div>
                    </label>
                  </div>

                  {config.usajobs?.enabled && (
                    <div className="space-y-3">
                      <p className="rounded-lg border border-surface-200 bg-surface-50 p-3 text-xs text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300">
                        Automatic USAJobs checks contact USAJobs. They use your
                        access code, USAJobs email, search words, location,
                        remote choice, posted-within choice, and result limit.
                        Leave this off for browser-only search.
                      </p>
                      {/* Advanced USAJobs setup */}
                      {!credentialStatus.usajobs_api_key && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="flex items-center gap-1.5 text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                            <SettingsSymbol icon="bolt" className="h-4 w-4" />
                            <span>Optional USAJobs auto-check</span>
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                            Skip this if you only want to open USAJobs in your
                            browser. Search links need no access code.
                          </p>
                          <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4 list-decimal">
                            <li>Use the browser search link for no setup</li>
                            <li>Use optional monitoring only if you want JobSentinel to check USAJobs for you</li>
                            <li>Ask USAJobs for an access code with your email</li>
                            <li>Copy the access code from your email</li>
                            <li>Paste it here</li>
                          </ol>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <a
                              href="https://www.usajobs.gov/Search/Results"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-200 text-sm font-medium rounded transition-colors hover:bg-blue-100 dark:hover:bg-blue-900"
                            >
                              Open USAJobs search in your browser
                            </a>
                            <a
                              href="https://developer.usajobs.gov/APIRequest/Index"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                            >
                              Request USAJobs access code
                            </a>
                          </div>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                            This opens a USAJobs access-code page that may use
                            official setup wording. Skip it unless you want automatic
                            USAJobs checks; browser search still works.
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
                            USAJobs access code
                            <SecurityBadge
                              stored={credentialStatus.usajobs_api_key}
                            />
                          </label>
                          <Input
                            type="password"
                            value={credentials.usajobs_api_key}
                            onChange={(e) =>
                              setCredentials((prev) => ({
                                ...prev,
                                usajobs_api_key: e.target.value,
                              }))
                            }
                            placeholder={
                              credentialStatus.usajobs_api_key
                                ? "Enter new code to update"
                                : "Paste your USAJobs access code"
                            }
                            autoComplete="off"
                          />
                        </div>
                        <Input
                          label="Email (same as signup)"
                          value={config.usajobs?.email ?? ""}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              usajobs: {
                                ...config.usajobs,
                                email: e.target.value,
                                enabled: config.usajobs?.enabled ?? false,
                                remote_only:
                                  config.usajobs?.remote_only ?? false,
                                date_posted_days:
                                  config.usajobs?.date_posted_days ?? 30,
                                limit: config.usajobs?.limit ?? 100,
                              },
                            })
                          }
                          placeholder="your@email.com"
                          hint="Use the same email you used with USAJobs"
                          autoComplete="email"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          label="Search words"
                          value={config.usajobs?.keywords ?? ""}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              usajobs: {
                                ...config.usajobs,
                                keywords: e.target.value,
                                enabled: config.usajobs?.enabled ?? false,
                                email: config.usajobs?.email ?? "",
                                remote_only:
                                  config.usajobs?.remote_only ?? false,
                                date_posted_days:
                                  config.usajobs?.date_posted_days ?? 30,
                                limit: config.usajobs?.limit ?? 100,
                              },
                            })
                          }
                          placeholder="e.g., program manager"
                        />
                        <Input
                          label="Location"
                          value={config.usajobs?.location ?? ""}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              usajobs: {
                                ...config.usajobs,
                                location: e.target.value,
                                enabled: config.usajobs?.enabled ?? false,
                                email: config.usajobs?.email ?? "",
                                remote_only:
                                  config.usajobs?.remote_only ?? false,
                                date_posted_days:
                                  config.usajobs?.date_posted_days ?? 30,
                                limit: config.usajobs?.limit ?? 100,
                              },
                            })
                          }
                          placeholder="e.g., Washington, DC"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.usajobs?.remote_only ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                usajobs: {
                                  ...config.usajobs,
                                  remote_only: e.target.checked,
                                  enabled: config.usajobs?.enabled ?? false,
                                  email: config.usajobs?.email ?? "",
                                  date_posted_days:
                                    config.usajobs?.date_posted_days ?? 30,
                                  limit: config.usajobs?.limit ?? 100,
                                },
                              })
                            }
                            className="rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                          />
                          <span className="text-sm text-surface-700 dark:text-surface-300">
                            Remote only
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-surface-700 dark:text-surface-300">
                            Posted within:
                          </label>
                          <select
                            value={config.usajobs?.date_posted_days ?? 30}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                usajobs: {
                                  ...config.usajobs,
                                  date_posted_days: parseInt(e.target.value),
                                  enabled: config.usajobs?.enabled ?? false,
                                  email: config.usajobs?.email ?? "",
                                  remote_only:
                                    config.usajobs?.remote_only ?? false,
                                  limit: config.usajobs?.limit ?? 100,
                                },
                              })
                            }
                            className="px-2 py-1 text-sm border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
                          >
                            <option value={7}>7 days</option>
                            <option value={14}>14 days</option>
                            <option value={30}>30 days</option>
                            <option value={60}>60 days</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-surface-700 dark:text-surface-300">
                            Max results:
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="500"
                            value={config.usajobs?.limit ?? 100}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                usajobs: {
                                  ...config.usajobs,
                                  limit: parseInt(e.target.value) || 100,
                                  enabled: config.usajobs?.enabled ?? false,
                                  email: config.usajobs?.email ?? "",
                                  remote_only:
                                    config.usajobs?.remote_only ?? false,
                                  date_posted_days:
                                    config.usajobs?.date_posted_days ?? 30,
                                },
                              })
                            }
                            className="w-20 px-2 py-1 text-sm border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Smart Recommendations */}
                {jobBoardRecommendations.length > 0 && (
                  <div className="mb-4 p-3 bg-sentinel-50 dark:bg-sentinel-900/20 border border-sentinel-200 dark:border-sentinel-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <SettingsSymbol icon="lightbulb" className="h-4 w-4 text-sentinel-700 dark:text-sentinel-300" />
                      <span className="text-sm font-medium text-sentinel-700 dark:text-sentinel-300">
                        Recommended for you
                      </span>
                    </div>
                    <div className="space-y-2">
                      {jobBoardRecommendations.map((rec) => (
                        <div
                          key={rec.board}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
                              {rec.board}
                            </span>
                            <span className="text-xs text-surface-500 dark:text-surface-400 ml-2">
                              — {rec.reason}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={rec.enable}
                            className="text-xs px-2 py-1 bg-sentinel-500 hover:bg-sentinel-600 text-white rounded transition-colors"
                          >
                            Enable
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* More Job Boards - Collapsible Section */}
                <details className="border border-surface-200 dark:border-surface-700 rounded-lg">
                  <summary className="p-4 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50 font-medium text-surface-800 dark:text-surface-200 flex items-center gap-2">
                    <span>More Job Boards</span>
                    <span className="text-xs text-surface-500 dark:text-surface-400 font-normal">
                      (optional sources)
                    </span>
                  </summary>
                  <div className="p-4 pt-0 space-y-4">
                    {/* Optional connected job source */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3 gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <SettingsSymbol icon="settings" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            Connected job source
                          </span>
                          <Badge
                            variant={jobsWithGptPayloadApproved ? "success" : "surface"}
                            size="sm"
                          >
                            {jobsWithGptPayloadApproved ? "Approved" : "Review required"}
                          </Badge>
                        </div>
                      </div>

                      <Input
                        label="Optional job-source link"
                        value={config.jobswithgpt_endpoint ?? ""}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            jobswithgpt_endpoint: e.target.value,
                          })
                        }
                        placeholder="Paste a job-source link from a service you trust"
                        hint="Off until you review and approve the details below"
                      />

                      {hasJobsWithGptEndpoint && !hasJobsWithGptTitles && (
                        <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                          <SettingsSymbol icon="warning" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            Add at least one job title in Basic Settings before
                            this source can be approved.
                          </span>
                        </div>
                      )}

                      {jobsWithGptPayload && (
                        <div className="mt-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-3">
                          <p className="text-xs font-semibold text-surface-700 dark:text-surface-200 mb-2">
                            Review before JobSentinel contacts this source
                          </p>
                          <dl className="grid grid-cols-1 gap-2 text-xs text-surface-600 dark:text-surface-300 sm:grid-cols-[8rem_1fr]">
                            <dt className="font-medium">Source address</dt>
                            <dd className="break-all">{jobsWithGptPayload.endpoint}</dd>
                            <dt className="font-medium">Job titles</dt>
                            <dd>{jobsWithGptPayload.titles.join(", ")}</dd>
                            <dt className="font-medium">Location</dt>
                            <dd>Not sent</dd>
                            <dt className="font-medium">Work location sent</dt>
                            <dd>
                              {jobsWithGptPayload.remote_only
                                ? "Remote only"
                                : "Uses your saved work-location choices"}
                            </dd>
                            <dt className="font-medium">Jobs to ask for</dt>
                            <dd>{jobsWithGptPayload.limit}</dd>
                          </dl>
                          {jobsWithGptPayloadApproved && (
                            <p className="mt-3 text-xs text-green-700 dark:text-green-300">
                              Approved for these exact details. If anything
                              changes, this source stays off until you approve
                              it again.
                            </p>
                          )}
                          {(jobsWithGptLastRequest || jobsWithGptPayloadApproved) && (
                            <div className="mt-3 rounded-md border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-2 text-xs text-surface-600 dark:text-surface-300">
                              <p className="font-semibold text-surface-700 dark:text-surface-200">
                                Last contacted:{" "}
                                {jobsWithGptLastRequest
                                  ? formatSourceRequestTime(jobsWithGptLastRequest.sentAt)
                                  : "Not yet"}
                              </p>
                              {jobsWithGptLastRequest && (
                                <dl className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-[8rem_1fr]">
                                  <dt className="font-medium">Website contacted</dt>
                                  <dd className="break-all">
                                    {jobsWithGptLastRequest.endpointHost ?? "Not recorded"}
                                  </dd>
                                  <dt className="font-medium">Saved titles</dt>
                                  <dd>{jobsWithGptLastRequest.titleCount}</dd>
                                  <dt className="font-medium">Location sent</dt>
                                  <dd>
                                    {jobsWithGptLastRequest.hasLocation ? "Yes" : "No"}
                                  </dd>
                                  <dt className="font-medium">Work location</dt>
                                  <dd>
                                    {jobsWithGptLastRequest.remoteOnly
                                      ? "Remote only"
                                      : "Saved choices"}
                                  </dd>
                                  <dt className="font-medium">Jobs requested</dt>
                                  <dd>{jobsWithGptLastRequest.resultLimit}</dd>
                                  <dt className="font-medium">Last result</dt>
                                  <dd>
                                    {formatSourceRequestOutcome(
                                      jobsWithGptLastRequest.outcome,
                                    )}
                                  </dd>
                                </dl>
                              )}
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant={jobsWithGptPayloadApproved ? "secondary" : "primary"}
                              onClick={approveJobsWithGptPayload}
                            >
                              Approve these exact details
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={clearJobsWithGptApproval}
                              disabled={!config.jobswithgpt_approval.enabled}
                            >
                              Remove approval
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RemoteOK */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <SettingsSymbol icon="globe" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            RemoteOK
                          </span>
                          <span className="text-xs text-surface-500">
                            (Remote-only jobs)
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn Remote OK automatic checks on or off"
                            checked={config.remoteok?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                remoteok: {
                                  ...config.remoteok,
                                  enabled: e.target.checked,
                                  tags: config.remoteok?.tags ?? [],
                                  limit: config.remoteok?.limit ?? 50,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                    </div>

                    {/* WeWorkRemotely */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <SettingsSymbol icon="home" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            WeWorkRemotely
                          </span>
                          <span className="text-xs text-surface-500">
                            (Remote jobs)
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn We Work Remotely automatic checks on or off"
                            checked={config.weworkremotely?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                weworkremotely: {
                                  ...config.weworkremotely,
                                  enabled: e.target.checked,
                                  limit: config.weworkremotely?.limit ?? 50,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                    </div>

                    {/* BuiltIn */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <SettingsSymbol icon="city" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            BuiltIn
                          </span>
                          <span className="text-xs text-surface-500">
                            (Technology-focused local jobs)
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn BuiltIn automatic checks on or off"
                            checked={config.builtin?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                builtin: {
                                  ...config.builtin,
                                  enabled: e.target.checked,
                                  cities: config.builtin?.cities ?? [],
                                  limit: config.builtin?.limit ?? 50,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                    </div>

                    {/* Hacker News Who's Hiring */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <SettingsSymbol icon="chat" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            Hacker News Who's Hiring
                          </span>
                          <span className="text-xs text-surface-500">
                            (Monthly thread)
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn Hacker News hiring post checks on or off"
                            checked={config.hn_hiring?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                hn_hiring: {
                                  ...config.hn_hiring,
                                  enabled: e.target.checked,
                                  remote_only:
                                    config.hn_hiring?.remote_only ?? false,
                                  limit: config.hn_hiring?.limit ?? 50,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                    </div>

                    {/* Dice */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <SettingsSymbol icon="briefcase" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            Dice
                          </span>
                          <span className="text-xs text-surface-500">
                            (Technology-focused jobs)
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn Dice automatic checks on or off"
                            checked={config.dice?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                dice: {
                                  ...config.dice,
                                  enabled: e.target.checked,
                                  query: config.dice?.query ?? "",
                                  limit: config.dice?.limit ?? 50,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                    </div>

                    {/* YC Work at a Startup */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <SettingsSymbol icon="rocket" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            YC Startups
                          </span>
                          <span className="text-xs text-surface-500">
                            (Y Combinator)
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn YC Startup automatic checks on or off"
                            checked={config.yc_startup?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                yc_startup: {
                                  ...config.yc_startup,
                                  enabled: e.target.checked,
                                  remote_only:
                                    config.yc_startup?.remote_only ?? false,
                                  limit: config.yc_startup?.limit ?? 50,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                    </div>

                    {/* SimplyHired */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <SettingsSymbol icon="clipboard" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            SimplyHired
                          </span>
                          <span className="text-xs text-surface-500">
                            (Job aggregator)
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn SimplyHired automatic checks on or off"
                            checked={config.simplyhired?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                simplyhired: {
                                  ...config.simplyhired,
                                  enabled: e.target.checked,
                                  query: config.simplyhired?.query ?? "",
                                  limit: config.simplyhired?.limit ?? 50,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                      {config.simplyhired?.enabled && (
                        <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                          <SettingsSymbol icon="warning" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            This site does not always let JobSentinel check
                            listings. If few jobs appear, use Job Site Search
                            Links or import a job from its browser address.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Glassdoor */}
                    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <SettingsSymbol icon="search" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                          <span className="font-medium text-surface-800 dark:text-surface-200">
                            Glassdoor
                          </span>
                          <span className="text-xs text-surface-500">
                            (Jobs + reviews)
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Turn Glassdoor automatic checks on or off"
                            checked={config.glassdoor?.enabled ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                glassdoor: {
                                  ...config.glassdoor,
                                  enabled: e.target.checked,
                                  query: config.glassdoor?.query ?? "",
                                  limit: config.glassdoor?.limit ?? 50,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
                        </label>
                      </div>
                      {config.glassdoor?.enabled && (
                        <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                          <SettingsSymbol icon="warning" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            This site does not always let JobSentinel check
                            listings. If few jobs appear, use Job Site Search
                            Links or import a job from its browser address.
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="flex items-start gap-1.5 text-xs text-surface-500 dark:text-surface-400 pt-2">
                      <SettingsSymbol icon="lightbulb" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      <span>
                        These job boards can be monitored when enabled. Choose
                        the ones relevant to your job search.
                      </span>
                    </p>
                  </div>
                </details>
              </section>

              {/* Browser Button */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Browser Button
                  <HelpIcon text="Save many job pages into JobSentinel with a browser button you control." />
                </h3>
                <BookmarkletGenerator />
              </section>

              {/* Posting risk and freshness settings */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Posting Risk and Freshness
                  <HelpIcon text="Choose how strongly JobSentinel warns about stale, reposted, or postings that need review." />
                </h3>
                {ghostConfig && (
                  <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 space-y-4">
                    {/* Preset Buttons */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                        Freshness behavior:
                      </span>
                      <div className="flex gap-2">
                        {GHOST_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => applyGhostPreset(preset)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                              ghostPreset === preset
                                ? preset === "lenient"
                                  ? "bg-green-500 text-white"
                                  : preset === "balanced"
                                    ? "bg-sentinel-500 text-white"
                                    : "bg-red-500 text-white"
                                : "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600"
                            }`}
                          >
                            {GHOST_PRESET_LABELS[preset]}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setGhostPreset("custom")}
                          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            ghostPreset === "custom"
                              ? "bg-surface-600 text-white"
                              : "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600"
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-surface-500 dark:text-surface-400 -mt-2">
                      {GHOST_PRESET_DESCRIPTIONS[ghostPreset]}
                    </p>

                    {/* Show detailed settings only in custom mode */}
                    {ghostPreset === "custom" && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                              Warn when a posting is older than
                            </label>
                            <Input
                              type="number"
                              min="1"
                              max="365"
                              value={ghostConfig.stale_threshold_days}
                              onChange={(e) =>
                                setGhostConfig({
                                  ...ghostConfig,
                                  stale_threshold_days:
                                    parseInt(e.target.value) || 60,
                                })
                              }
                              hint="Older postings get a stale-posting warning"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                              Warn after a posting appears this many times
                            </label>
                            <Input
                              type="number"
                              min="1"
                              max="20"
                              value={ghostConfig.repost_threshold}
                              onChange={(e) =>
                                setGhostConfig({
                                  ...ghostConfig,
                                  repost_threshold:
                                    parseInt(e.target.value) || 3,
                                })
                              }
                              hint="Repeated postings get an earlier review warning"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Warn when a job description is very short
                          </label>
                          <Input
                            type="number"
                            min="50"
                            max="1000"
                            value={ghostConfig.min_description_length}
                            onChange={(e) =>
                              setGhostConfig({
                                ...ghostConfig,
                                min_description_length:
                                  parseInt(e.target.value) || 200,
                              })
                            }
                            hint="Shorter descriptions get a low-detail warning"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={ghostConfig.penalize_missing_salary}
                                onChange={(e) =>
                                  setGhostConfig({
                                    ...ghostConfig,
                                    penalize_missing_salary: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                              />
                              <span className="text-sm text-surface-700 dark:text-surface-300">
                                Flag jobs without salary info
                              </span>
                            </label>
                            <HelpIcon
                              text="Many legitimate jobs don't list pay. Turn this on when missing pay should trigger an earlier review warning."
                              position="right"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                              Show posting-risk warning:{" "}
                              {formatPostingRiskWarningLabel(ghostConfig.warning_threshold)}
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={ghostConfig.warning_threshold}
                              onChange={(e) =>
                                setGhostConfig({
                                  ...ghostConfig,
                                  warning_threshold: parseFloat(e.target.value),
                                })
                              }
                              className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer accent-sentinel-500"
                            />
                            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                              Move left to warn sooner. Move right to warn later.
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                              Hide postings that need review:{" "}
                              {formatPostingRiskHideLabel(ghostConfig.hide_threshold)}
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={ghostConfig.hide_threshold}
                              onChange={(e) =>
                                setGhostConfig({
                                  ...ghostConfig,
                                  hide_threshold: parseFloat(e.target.value),
                                })
                              }
                              className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                            />
                            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                              Move left to hide more flagged jobs by default. Move right to keep more visible.
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="secondary"
                        onClick={handleResetGhostConfig}
                        loading={ghostConfigLoading}
                        className="flex-1"
                      >
                        Reset to Defaults
                      </Button>
                      <Button
                        onClick={handleSaveGhostConfig}
                        loading={ghostConfigLoading}
                        className="flex-1"
                      >
                        Save Settings
                      </Button>
                    </div>
                  </div>
                )}
                {!ghostConfig && (
                  <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
                    <div
                      className="flex items-center justify-center py-4"
                      role="status"
                      aria-label="Loading ghost config"
                    >
                      <div
                        className="animate-spin w-6 h-6 border-4 border-sentinel-500 border-t-transparent rounded-full"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Loading settings...</span>
                    </div>
                  </div>
                )}
              </section>

              {/* Use Resume to Sort Jobs */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Use Resume to Sort Jobs
                  <HelpIcon text="When enabled, job scores use skills from your uploaded resume plus the search words you chose." />
                </h3>
                <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <SettingsSymbol icon="document" className="h-6 w-6 text-surface-500 dark:text-surface-400" />
                      <div>
                        <div className="text-sm font-medium text-surface-900 dark:text-white">
                          Use Resume for Scoring
                        </div>
                        <div className="text-xs text-surface-500 dark:text-surface-400">
                          Match jobs against your resume skills first, then your
                          search words
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.use_resume_matching ?? false}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            use_resume_matching: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
                    </label>
                  </div>
                  <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
                    <p className="flex items-start gap-1.5 text-xs text-surface-500 dark:text-surface-400">
                      <SettingsSymbol icon="lightbulb" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      <span>
                        <strong>Tip:</strong> Upload your resume in the{" "}
                        <strong>Resume</strong> tab first. If no resume is
                        uploaded, scoring uses your job titles and search words.
                      </span>
                    </p>
                  </div>
                </div>
              </section>

              {/* Match Review Guide */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Match Review Guide
                  <HelpIcon text="These areas show what JobSentinel reviews when it sorts jobs. Use any match label to see the details." />
                </h3>
                <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 bg-surface-50 dark:bg-surface-900/20">
                  <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
                    JobSentinel reviews each job against your preferences and
                    shows a match label. These areas explain what shapes the
                    review by default.
                  </p>
                  <div className="space-y-3">
                    {/* Skills */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SettingsSymbol icon="target" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                        <div>
                          <div className="text-sm font-medium text-surface-900 dark:text-white">
                            Skills Match
                          </div>
                          <div className="text-xs text-surface-500 dark:text-surface-400">
                            Job title and search-word matches
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-surface-900 dark:text-white">
                          Primary
                        </div>
                        <div className="text-xs text-surface-500 dark:text-surface-400">
                          review area
                        </div>
                      </div>
                    </div>

                    {/* Salary */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SettingsSymbol icon="currency" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                        <div>
                          <div className="text-sm font-medium text-surface-900 dark:text-white">
                            Salary
                          </div>
                          <div className="text-xs text-surface-500 dark:text-surface-400">
                            Meets your salary requirements
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-surface-900 dark:text-white">
                          Important
                        </div>
                        <div className="text-xs text-surface-500 dark:text-surface-400">
                          review area
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SettingsSymbol icon="location" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                        <div>
                          <div className="text-sm font-medium text-surface-900 dark:text-white">
                            Location
                          </div>
                          <div className="text-xs text-surface-500 dark:text-surface-400">
                            Remote/hybrid/onsite preference
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-surface-900 dark:text-white">
                          Important
                        </div>
                        <div className="text-xs text-surface-500 dark:text-surface-400">
                          review area
                        </div>
                      </div>
                    </div>

                    {/* Company */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SettingsSymbol icon="company" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                        <div>
                          <div className="text-sm font-medium text-surface-900 dark:text-white">
                            Company
                          </div>
                          <div className="text-xs text-surface-500 dark:text-surface-400">
                            Companies you prefer or hide
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-surface-900 dark:text-white">
                          Supporting
                        </div>
                        <div className="text-xs text-surface-500 dark:text-surface-400">
                          review area
                        </div>
                      </div>
                    </div>

                    {/* Recency */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SettingsSymbol icon="clock" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                        <div>
                          <div className="text-sm font-medium text-surface-900 dark:text-white">
                            Recency
                          </div>
                          <div className="text-xs text-surface-500 dark:text-surface-400">
                            How fresh the posting is
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-surface-900 dark:text-white">
                          Supporting
                        </div>
                        <div className="text-xs text-surface-500 dark:text-surface-400">
                          review area
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                    <p className="flex items-start gap-1.5 text-xs text-surface-500 dark:text-surface-400">
                      <SettingsSymbol icon="lightbulb" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      <span>
                        <strong>Tip:</strong> Search words, pay, and location stay
                        easiest to review by default. Change your
                        preferences above to improve your job matches.
                      </span>
                    </p>
                  </div>
                </div>
              </section>

              {/* Troubleshooting */}
              <section className="mb-6">
                <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  Troubleshooting
                  <HelpIcon text="If something is not working, these details can help explain what happened." />
                </h3>

                {/* Job Sources Button */}
                <div className="mb-4">
                  <button
                    onClick={() => setShowHealthDashboard(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors w-full justify-center"
                  >
                    <HealthIcon className="w-5 h-5 text-sentinel-500" />
                    View Job Sources
                  </button>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 text-center">
                    See which sources are working and what to try next
                  </p>
                </div>

                <ErrorLogPanel />
              </section>
            </div>
          )}

          {/* Backup & Restore - visible on both tabs */}
          <div className="mb-4">
            <div className="flex gap-3">
              <button
                onClick={handleImportConfig}
                className="flex items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors"
                title="Restore settings from a backup file"
              >
                <ImportIcon className="w-4 h-4" />
                Restore Settings
              </button>
              <button
                onClick={handleExportConfig}
                className="flex items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors"
                title="Save your current settings to a private backup file"
                aria-describedby="settings-backup-privacy-note"
              >
                <ExportIcon className="w-4 h-4" />
                Backup Settings
              </button>
            </div>
            <p
              id="settings-backup-privacy-note"
              className="mt-2 text-xs text-surface-500 dark:text-surface-400"
            >
              Settings backups are private files. They can include job titles,
              pay choices, locations, company preferences, and alert settings.
              Do not attach them to support requests; use a safe support report
              instead.
            </p>
          </div>

          {/* Help & Feedback */}
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors"
              title="Get help, report a problem, or suggest an improvement"
            >
              <FeedbackIcon className="w-4 h-4" />
              Send Feedback
            </button>
            <button
              onClick={handleCopyDebugReport}
              disabled={copyingDebugReport}
              className="flex items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
              title="Copy a safe support report you can share only if you want help"
            >
              <SettingsSymbol icon="clipboard" className="w-4 h-4" />
              {copyingDebugReport
                ? "Copying Safe Support Report..."
                : "Copy Safe Support Report"}
            </button>
            <button
              onClick={handleSaveDebugReport}
              disabled={savingDebugReport}
              className="flex items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
              title="Save a safe support report you can share only if you want help"
            >
              <SettingsSymbol icon="document" className="w-4 h-4" />
              {savingDebugReport
                ? "Saving Safe Support Report..."
                : "Save Safe Support Report"}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              loadingText="Saving..."
              className="flex-1"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Card>

      {/* Job Sources Modal */}
      {showHealthDashboard && (
        <ScraperHealthDashboard onClose={() => setShowHealthDashboard(false)} />
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </div>
  );
}

function SettingsIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function SettingsSymbol({
  icon,
  className = "w-5 h-5",
}: {
  icon:
    | "bell"
    | "bolt"
    | "briefcase"
    | "building"
    | "chat"
    | "check"
    | "city"
    | "clipboard"
    | "clock"
    | "company"
    | "currency"
    | "document"
    | "globe"
    | "home"
    | "lightbulb"
    | "location"
    | "rocket"
    | "search"
    | "send"
    | "settings"
    | "target"
    | "users"
    | "warning";
  className?: string;
}) {
  const commonProps = {
    className,
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    "aria-hidden": true,
  };

  switch (icon) {
    case "bell":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 01-6 0" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6V5a2 2 0 012-2h0a2 2 0 012 2v1m-9 4h14M5 8h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z" />
        </svg>
      );
    case "building":
    case "company":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 21V7a2 2 0 012-2h8a2 2 0 012 2v14M9 9h1m-1 4h1m4-4h1m-1 4h1M3 21h18" />
        </svg>
      );
    case "chat":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.4-4 8-9 8a10 10 0 01-4.3-.9L3 20l1.4-3.7A7 7 0 013 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
        </svg>
      );
    case "check":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case "city":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21h18M5 21V8l7-4 7 4v13M9 10h1m-1 4h1m4-4h1m-1 4h1" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5h6m-6 4h6m-6 4h4m-6 8h10a2 2 0 002-2V7a2 2 0 00-2-2h-2a3 3 0 00-6 0H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "clock":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "currency":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v12m3-9.5A3.5 3.5 0 0012 7c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2a3.5 3.5 0 01-3-1.5" />
        </svg>
      );
    case "document":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 3h7l5 5v13H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 3v5h5M8 13h8M8 17h6" />
        </svg>
      );
    case "globe":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3 12h18M12 3c2 2.5 3 5.5 3 9s-1 6.5-3 9c-2-2.5-3-5.5-3-9s1-6.5 3-9z" />
        </svg>
      );
    case "home":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 11l9-7 9 7M5 10v11h14V10M9 21v-6h6v6" />
        </svg>
      );
    case "lightbulb":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 18h6m-5 3h4m-2-18a6 6 0 00-3.5 10.9c.7.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" />
        </svg>
      );
    case "location":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s6-5.4 6-11a6 6 0 10-12 0c0 5.6 6 11 6 11z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10.5h.01" />
        </svg>
      );
    case "rocket":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 19c4.5-1 9.5-6 10.5-10.5L19 5l-3.5 1C11 7 6 12 5 16.5V19z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 15l-4 4m10-14l4 4" />
        </svg>
      );
    case "search":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.5-4.5m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case "send":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 12l16-8-4 16-4-6-8-2z" />
        </svg>
      );
    case "settings":
      return <SettingsIcon className={className} />;
    case "target":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "users":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2m14-10a4 4 0 10-8 0 4 4 0 008 0zm4 10v-2a4 4 0 00-3-3.9m-2-11a4 4 0 010 7.8" />
        </svg>
      );
    case "warning":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.94 4h13.88c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.33 16c-.77 1.33.19 3 1.73 3z" />
        </svg>
      );
  }
}

function CloseIcon() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function LinkedInIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function EmailIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function ImportIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

function ExportIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function HealthIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}
