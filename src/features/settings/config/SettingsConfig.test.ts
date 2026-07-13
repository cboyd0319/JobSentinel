import { describe, expect, it } from "vitest";
import {
  getCredentialValidationError,
  DEFAULT_EXTERNAL_AI_CONFIG,
  type Config,
  type CredentialKey,
  type CredentialStatusMap,
  type CredentialStatusState,
  type Credentials,
} from "./SettingsConfig";

function makeConfig(): Config {
  return {
    title_allowlist: [],
    title_blocklist: [],
    keywords_boost: [],
    keywords_exclude: [],
    location_preferences: {
      allow_remote: true,
      allow_hybrid: false,
      allow_onsite: false,
      cities: [],
    },
    salary_floor_usd: 0,
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

function makeCredentials(overrides: Partial<Credentials> = {}): Credentials {
  return {
    slack_webhook: "",
    smtp_password: "",
    discord_webhook: "",
    teams_webhook: "",
    telegram_bot_token: "",
    usajobs_api_key: "",
    external_ai_openai_api_key: "",
    external_ai_anthropic_api_key: "",
    external_ai_google_api_key: "",
    external_ai_github_copilot_api_key: "",
    external_ai_custom_api_key: "",
    ...overrides,
  };
}

function statusValue(state: CredentialStatusState) {
  return {
    exists: state === "saved" || state === "needs_attention",
    available: state !== "expected" && state !== "needs_attention",
    state,
  };
}

function makeCredentialStatus(
  overrides: Partial<Record<CredentialKey, CredentialStatusState>> = {},
): CredentialStatusMap {
  return {
    slack_webhook: statusValue(overrides.slack_webhook ?? "empty"),
    smtp_password: statusValue(overrides.smtp_password ?? "empty"),
    discord_webhook: statusValue(overrides.discord_webhook ?? "empty"),
    teams_webhook: statusValue(overrides.teams_webhook ?? "empty"),
    telegram_bot_token: statusValue(overrides.telegram_bot_token ?? "empty"),
    usajobs_api_key: statusValue(overrides.usajobs_api_key ?? "empty"),
    external_ai_openai_api_key: statusValue(
      overrides.external_ai_openai_api_key ?? "empty",
    ),
    external_ai_anthropic_api_key: statusValue(
      overrides.external_ai_anthropic_api_key ?? "empty",
    ),
    external_ai_google_api_key: statusValue(
      overrides.external_ai_google_api_key ?? "empty",
    ),
    external_ai_github_copilot_api_key: statusValue(
      overrides.external_ai_github_copilot_api_key ?? "empty",
    ),
    external_ai_custom_api_key: statusValue(
      overrides.external_ai_custom_api_key ?? "empty",
    ),
  };
}

describe("getCredentialValidationError", () => {
  it("does not treat expected Telegram details as confirmed saved secrets", () => {
    const config = makeConfig();
    config.alerts.telegram = { enabled: true, chat_id: "12345" };

    expect(
      getCredentialValidationError(
        makeCredentials(),
        config,
        makeCredentialStatus({ telegram_bot_token: "expected" }),
      ),
    ).toEqual({
      title: "Finish Telegram alerts",
      message:
        "Add the Telegram details shown below, or turn Telegram alerts off.",
    });
  });

  it("does not treat expected USAJobs details as confirmed saved secrets", () => {
    const config = makeConfig();
    config.usajobs = {
      ...config.usajobs,
      enabled: true,
      email: "person@example.com",
    };

    expect(
      getCredentialValidationError(
        makeCredentials(),
        config,
        makeCredentialStatus({ usajobs_api_key: "expected" }),
      ),
    ).toEqual({
      title: "Finish USAJobs scheduled checks",
      message:
        "Add the USAJobs email and access code shown below, or turn USAJobs scheduled checks off.",
    });
  });

  it("accepts confirmed saved or newly entered required secrets", () => {
    const config = makeConfig();
    config.alerts.telegram = { enabled: true, chat_id: "12345" };
    config.usajobs = {
      ...config.usajobs,
      enabled: true,
      email: "person@example.com",
    };

    expect(
      getCredentialValidationError(
        makeCredentials(),
        config,
        makeCredentialStatus({
          telegram_bot_token: "saved",
          usajobs_api_key: "saved",
        }),
      ),
    ).toBeNull();

    expect(
      getCredentialValidationError(
        makeCredentials({
          telegram_bot_token: "new-telegram-token",
          usajobs_api_key: "new-usajobs-key",
        }),
        config,
        makeCredentialStatus({
          telegram_bot_token: "expected",
          usajobs_api_key: "expected",
        }),
      ),
    ).toBeNull();
  });

  it("blocks restricted scheduled sources until the user accepts the risk", () => {
    const config = makeConfig();
    config.dice = {
      ...config.dice,
      enabled: true,
      query: "care coordinator",
    };

    expect(
      getCredentialValidationError(
        makeCredentials(),
        config,
        makeCredentialStatus(),
      ),
    ).toEqual({
      title: "Review restricted source risk",
      message:
        "Check the acknowledgement box for Dice, or turn those scheduled checks off.",
    });
  });

  it("allows a restricted scheduled source after explicit acknowledgement", () => {
    const config = makeConfig();
    config.glassdoor = {
      ...config.glassdoor,
      enabled: true,
      query: "care coordinator",
    };
    config.restricted_source_acknowledgements.glassdoor = true;

    expect(
      getCredentialValidationError(
        makeCredentials(),
        config,
        makeCredentialStatus(),
      ),
    ).toBeNull();
  });

  it("requires a saved or newly entered key for each enabled outside AI provider", () => {
    const config = makeConfig();
    config.external_ai = {
      ...DEFAULT_EXTERNAL_AI_CONFIG,
      enabled: true,
      provider: "open_ai",
      enabled_providers: ["open_ai", "anthropic"],
      provider_order: [
        "open_ai",
        "anthropic",
        "google_gemini",
        "github_copilot",
        "custom",
      ],
    };

    expect(
      getCredentialValidationError(
        makeCredentials(),
        config,
        makeCredentialStatus({ external_ai_openai_api_key: "saved" }),
      ),
    ).toEqual({
      title: "Add Anthropic key",
      message:
        "Paste the provider key, or turn that provider off. The key is stored in the local secure vault.",
    });

    expect(
      getCredentialValidationError(
        makeCredentials({ external_ai_anthropic_api_key: "new-anthropic-key" }),
        config,
        makeCredentialStatus({ external_ai_openai_api_key: "saved" }),
      ),
    ).toBeNull();
  });
});
