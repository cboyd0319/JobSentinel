import { vi } from "vitest";
import { invoke } from "../../platform/tauri";
import { DEFAULT_EXTERNAL_AI_CONFIG } from "./config/SettingsConfig";
import {
  downloadPrivateSettingsBackup,
  selectSettingsBackupFile,
} from "./support/settingsBackupFile";

export const mockInvoke = vi.mocked(invoke);
export const mockDownloadPrivateSettingsBackup = vi.mocked(
  downloadPrivateSettingsBackup,
);
export const mockSelectSettingsBackupFile = vi.mocked(selectSettingsBackupFile);

// Mock toast
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};
vi.mock("../../shared/toast/useToast", () => ({
  useToast: () => mockToast,
}));

vi.mock("../../shared/errorReporting/logger", () => ({
  logError: vi.fn(),
}));

vi.mock("../../shared/errorReporting/messages", () => ({
  getUserFriendlyError: (err: unknown) => ({
    title: "Error",
    message: String(err),
  }),
}));

vi.mock("./support/settingsBackupFile", () => ({
  downloadPrivateSettingsBackup: vi.fn(),
  selectSettingsBackupFile: vi.fn(),
}));

vi.mock("./support/ErrorLogPanel", () => ({
  ErrorLogPanel: () => <div data-testid="error-log-panel" />,
}));

// Minimal valid config that satisfies the Config interface
export function makeConfig() {
  return {
    title_allowlist: [],
    title_blocklist: [],
    keywords_boost: ["rust"],
    keywords_exclude: [],
    location_preferences: {
      allow_remote: true,
      allow_hybrid: false,
      allow_onsite: false,
      cities: [],
    },
    salary_floor_usd: 100000,
    preferred_companies: [],
    blocked_companies: [],
    auto_refresh: { enabled: false, interval_minutes: 30 },
    alerts: {
      slack: { enabled: false },
      email: {
        enabled: false,
        smtp_server: "",
        smtp_port: 587,
        smtp_username: "",
        from_email: "",
        to_emails: [],
        use_starttls: true,
      },
      discord: { enabled: false },
      telegram: { enabled: false },
      teams: { enabled: false },
      desktop: {
        enabled: false,
        show_when_focused: false,
        play_sound: false,
      },
    },
    linkedin: {
      enabled: false,
      query: "",
      location: "",
      remote_only: false,
      limit: 25,
    },
    remoteok: { enabled: false, tags: [], limit: 25 },
    weworkremotely: { enabled: false, limit: 25 },
    builtin: { enabled: false, cities: [], limit: 25 },
    hn_hiring: { enabled: false, remote_only: false, limit: 25 },
    dice: { enabled: false, query: "", limit: 25 },
    yc_startup: { enabled: false, remote_only: false, limit: 25 },
    usajobs: {
      enabled: false,
      email: "",
      remote_only: false,
      date_posted_days: 7,
      limit: 25,
    },
    simplyhired: { enabled: false, query: "", limit: 25 },
    glassdoor: { enabled: false, query: "", limit: 25 },
    restricted_source_acknowledgements: {
      builtin: false,
      dice: false,
      simplyhired: false,
      glassdoor: false,
    },
    jobswithgpt_endpoint: "",
    jobswithgpt_approval: {
      enabled: false,
      payload: null,
      approved_at: null,
    },
    external_ai: DEFAULT_EXTERNAL_AI_CONFIG,
    use_resume_matching: false,
  };
}

// Default ghost config
export function makeGhostConfig() {
  return {
    stale_threshold_days: 60,
    repost_threshold: 3,
    min_description_length: 200,
    penalize_missing_salary: false,
    warning_threshold: 0.3,
    hide_threshold: 0.7,
  };
}

// Wire up mockInvoke to handle the happy path
export function setupHappyPath() {
  mockInvoke.mockImplementation(async (cmd: string) => {
    if (cmd === "get_config") return makeConfig();
    if (cmd === "get_credential_status") return [];
    if (cmd === "get_credential_unlock_status") {
      return { mode: "system", configured: false, unlocked: true };
    }
    if (cmd === "has_credential") return false;
    if (cmd === "get_ghost_config") return makeGhostConfig();
    if (cmd === "detect_location") return null;
    if (cmd === "list_cover_letter_templates") return [];
    if (cmd === "list_saved_searches") return [];
    if (cmd === "import_cover_letter_templates") return 0;
    if (cmd === "import_saved_searches") return 0;
    return null;
  });
}
