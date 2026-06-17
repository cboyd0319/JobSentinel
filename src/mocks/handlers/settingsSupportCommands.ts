import {
  getMockConfigSummary,
  getMockFeedbackFilename,
  getMockSystemInfo,
  generateMockFeedbackReport,
  sanitizeMockFeedbackText,
  saveMockFeedbackFile,
} from "./supportReports";
import {
  hasConfiguredJobsWithGpt,
  hasEnabledMockScraperSource,
} from "./scraperHealth";
import {
  getArg,
  getDefaultGhostConfig,
  getNumericArg,
  getStringArg,
  hasConfiguredUrlList,
  isCredentialKey,
} from "./commandHelpers";
import type {
  MockBookmarkletConfig,
  MockConfig,
  MockCredentialKey,
  MockCredentialUnlockState,
  MockDashboardPreferences,
  MockGhostConfig,
} from "./types";

export interface MockSettingsSupportCommandState {
  config: MockConfig;
  credentials: Partial<Record<MockCredentialKey, string>>;
  credentialUnlock: MockCredentialUnlockState;
  ghostConfig: MockGhostConfig;
  bookmarkletConfig: MockBookmarkletConfig;
}

export interface MockSettingsSupportCommandResult {
  handled: boolean;
  shouldSave: boolean;
  state: MockSettingsSupportCommandState;
  value: unknown;
}

const MOCK_CREDENTIAL_KEYS: MockCredentialKey[] = [
  "slack_webhook",
  "smtp_password",
  "discord_webhook",
  "teams_webhook",
  "telegram_bot_token",
  "usajobs_api_key",
];
const MIN_BOOKMARKLET_PORT = 1024;
const MAX_BOOKMARKLET_PORT = 65535;

export function handleMockSettingsSupportCommand(
  command: string,
  args: Record<string, unknown> | undefined,
  state: MockSettingsSupportCommandState,
  hasActiveResume: boolean,
): MockSettingsSupportCommandResult {
  switch (command) {
    case "is_first_run":
      return withoutSave(state, false);

    case "complete_setup":
      return completeSetup(args, state);

    case "get_config":
      return withoutSave(state, state.config);

    case "get_dashboard_preferences":
      return withoutSave(state, getMockDashboardPreferences(state.config));

    case "get_resume_matching_preference":
      return withoutSave(state, {
        enabled: Boolean(state.config.use_resume_matching),
      });

    case "set_resume_matching_enabled":
      return {
        handled: true,
        shouldSave: true,
        state: {
          ...state,
          config: {
            ...state.config,
            use_resume_matching: Boolean(getArg(args, "enabled")),
          },
        },
        value: { enabled: Boolean(getArg(args, "enabled")) },
      };

    case "save_config":
      return {
        handled: true,
        shouldSave: true,
        state: {
          ...state,
          config: { ...state.config, ...(getArg(args, "config") as object) },
        },
        value: undefined,
      };

    case "get_credential_status":
      return withoutSave(
        state,
        MOCK_CREDENTIAL_KEYS.map((key) => ({
          key,
          exists: Boolean(state.credentials[key]),
          available: true,
        })),
      );

    case "has_credential": {
      const key = getArg(args, "key");
      return withoutSave(
        state,
        isCredentialKey(key) && Boolean(state.credentials[key]),
      );
    }

    case "store_credential":
      return storeCredential(args, state);

    case "get_credential_unlock_status":
      return withoutSave(state, state.credentialUnlock);

    case "enable_credential_passphrase":
      return updateCredentialUnlock(args, state, "enable");

    case "unlock_credential_vault":
      return updateCredentialUnlock(args, state, "unlock");

    case "disable_credential_passphrase":
      return updateCredentialUnlock(args, state, "disable");

    case "disconnect_linkedin":
      return {
        handled: true,
        shouldSave: true,
        state: {
          ...state,
          config: {
            ...state.config,
            linkedin: { ...state.config.linkedin, enabled: false },
          },
        },
        value: undefined,
      };

    case "linkedin_login":
      throw new Error(
        "LinkedIn automatic monitoring is disabled by JobSentinel source policy",
      );

    case "get_linkedin_expiry_status":
      return withoutSave(state, {
        connected: false,
        expires_at: null,
        days_remaining: null,
        expiry_warning: false,
        expired: false,
      });

    case "detect_location":
      return withoutSave(state, {
        city: "Denver",
        region: "CO",
        country: "US",
        timezone: "America/Denver",
      });

    case "get_ghost_config":
      return withoutSave(state, state.ghostConfig);

    case "set_ghost_config":
      return {
        handled: true,
        shouldSave: true,
        state: {
          ...state,
          ghostConfig: {
            ...state.ghostConfig,
            ...(getArg(args, "config") as Partial<MockGhostConfig>),
          },
        },
        value: undefined,
      };

    case "reset_ghost_config":
      return {
        handled: true,
        shouldSave: true,
        state: { ...state, ghostConfig: getDefaultGhostConfig() },
        value: undefined,
      };

    case "validate_slack_webhook":
    case "test_email_notification":
    case "copy_bookmarklet_code":
    case "open_github_issues":
    case "open_google_drive":
      return withoutSave(state, undefined);

    case "get_bookmarklet_config":
      return withoutSave(state, state.bookmarkletConfig);

    case "start_bookmarklet_server":
      return updateBookmarkletPort(args, state, true);

    case "stop_bookmarklet_server":
      return {
        handled: true,
        shouldSave: true,
        state: {
          ...state,
          bookmarkletConfig: { ...state.bookmarkletConfig, enabled: false },
        },
        value: undefined,
      };

    case "set_bookmarklet_port":
      return updateBookmarkletPort(args, state, state.bookmarkletConfig.enabled);

    case "get_system_info":
      return withoutSave(state, getMockSystemInfo());

    case "get_config_summary":
      return withoutSave(
        state,
        getMockConfigSummary(state.config, hasActiveResume),
      );

    case "get_debug_log_events":
      return withoutSave(state, []);

    case "generate_feedback_report":
      return withoutSave(
        state,
        generateMockFeedbackReport(args, state.config, hasActiveResume),
      );

    case "sanitize_feedback_text":
      return withoutSave(state, sanitizeMockFeedbackText(args));

    case "get_feedback_filename":
      return withoutSave(state, getMockFeedbackFilename());

    case "save_feedback_file":
      return withoutSave(state, saveMockFeedbackFile(args));

    case "reveal_saved_feedback_file": {
      const revealToken =
        getStringArg(args, "revealToken") ?? getStringArg(args, "reveal_token");
      if (!revealToken) {
        throw new Error("Reveal token cannot be empty");
      }
      return withoutSave(state, undefined);
    }

    default:
      return {
        handled: false,
        shouldSave: false,
        state,
        value: undefined,
      };
  }
}

function withoutSave(
  state: MockSettingsSupportCommandState,
  value: unknown,
): MockSettingsSupportCommandResult {
  return { handled: true, shouldSave: false, state, value };
}

function completeSetup(
  args: Record<string, unknown> | undefined,
  state: MockSettingsSupportCommandState,
): MockSettingsSupportCommandResult {
  const setupConfig = getArg(args, "config");
  if (!setupConfig || typeof setupConfig !== "object") {
    return withoutSave(state, undefined);
  }

  return {
    handled: true,
    shouldSave: true,
    state: {
      ...state,
      config: { ...state.config, ...(setupConfig as Partial<MockConfig>) },
    },
    value: undefined,
  };
}

function storeCredential(
  args: Record<string, unknown> | undefined,
  state: MockSettingsSupportCommandState,
): MockSettingsSupportCommandResult {
  const key = getArg(args, "key");
  const value = getArg(args, "value");
  if (!isCredentialKey(key) || typeof value !== "string") {
    return withoutSave(state, undefined);
  }

  return {
    handled: true,
    shouldSave: true,
    state: {
      ...state,
      credentials: { ...state.credentials, [key]: value },
    },
    value: undefined,
  };
}

function updateCredentialUnlock(
  args: Record<string, unknown> | undefined,
  state: MockSettingsSupportCommandState,
  action: "enable" | "unlock" | "disable",
): MockSettingsSupportCommandResult {
  const passphrase = getStringArg(args, "passphrase");
  if (!passphrase) {
    throw new Error("Enter the passphrase.");
  }

  if (action === "enable") {
    if (passphrase.trim().length < 12) {
      throw new Error("Use a passphrase with at least 12 non-space characters");
    }

    return credentialUnlockResult(state, {
      mode: "passphrase",
      configured: true,
      unlocked: true,
    });
  }

  if (!state.credentialUnlock.configured) {
    throw new Error("Credential passphrase lock is not enabled");
  }

  if (action === "disable") {
    return credentialUnlockResult(state, {
      mode: "system",
      configured: false,
      unlocked: true,
    });
  }

  return credentialUnlockResult(state, {
    mode: "passphrase",
    configured: true,
    unlocked: true,
  });
}

function credentialUnlockResult(
  state: MockSettingsSupportCommandState,
  credentialUnlock: MockCredentialUnlockState,
): MockSettingsSupportCommandResult {
  return {
    handled: true,
    shouldSave: true,
    state: { ...state, credentialUnlock },
    value: undefined,
  };
}

function updateBookmarkletPort(
  args: Record<string, unknown> | undefined,
  state: MockSettingsSupportCommandState,
  enabled: boolean,
): MockSettingsSupportCommandResult {
  const port = getNumericArg(args, "port") ?? state.bookmarkletConfig.port;
  if (
    !Number.isInteger(port) ||
    port < MIN_BOOKMARKLET_PORT ||
    port > MAX_BOOKMARKLET_PORT
  ) {
    throw new Error(
      `Choose a browser button number from ${MIN_BOOKMARKLET_PORT} to ${MAX_BOOKMARKLET_PORT}.`,
    );
  }

  return {
    handled: true,
    shouldSave: true,
    state: {
      ...state,
      bookmarkletConfig: { ...state.bookmarkletConfig, port, enabled },
    },
    value: undefined,
  };
}

function getMockDashboardPreferences(config: MockConfig): MockDashboardPreferences {
  return {
    autoRefresh: { ...config.auto_refresh },
    salaryFloorUsd: config.salary_floor_usd,
    anyJobSourceEnabled: anyMockJobSourceEnabled(config),
  };
}

function anyMockJobSourceEnabled(config: MockConfig): boolean {
  const configRecord = config as Record<string, unknown>;
  return (
    hasEnabledMockScraperSource(configRecord) ||
    hasConfiguredUrlList(configRecord, "greenhouse_urls") ||
    hasConfiguredUrlList(configRecord, "lever_urls") ||
    hasConfiguredJobsWithGpt(configRecord)
  );
}
