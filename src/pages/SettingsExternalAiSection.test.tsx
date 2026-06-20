import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SettingsExternalAiSection } from "./SettingsExternalAiSection";
import {
  DEFAULT_EXTERNAL_AI_CONFIG,
  type Config,
  type CredentialKey,
  type CredentialStatusMap,
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
    company_whitelist: [],
    company_blacklist: [],
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
    restricted_source_acknowledgements: {
      builtin: false,
      dice: false,
      simplyhired: false,
      glassdoor: false,
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

function makeCredentials(): Credentials {
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
  };
}

function makeCredentialStatus(): CredentialStatusMap {
  const status = {} as CredentialStatusMap;
  (Object.keys(makeCredentials()) as CredentialKey[]).forEach((key) => {
    status[key] = {
      key,
      exists: false,
      available: true,
      state: "empty",
    };
  });
  return status;
}

function ExternalAiHarness() {
  const [config, setConfig] = useState<Config>(makeConfig);
  const [credentials, setCredentials] = useState<Credentials>(makeCredentials);

  return (
    <>
      <SettingsExternalAiSection
        config={config}
        credentialStatus={makeCredentialStatus()}
        credentials={credentials}
        onConfigChange={setConfig}
        onCredentialsChange={setCredentials}
      />
      <output data-testid="external-ai-state">
        {JSON.stringify(config.external_ai)}
      </output>
      <output data-testid="external-ai-credentials">
        {JSON.stringify(credentials)}
      </output>
    </>
  );
}

describe("SettingsExternalAiSection", () => {
  it("configures multiple outside AI providers without storing keys in config", async () => {
    const user = userEvent.setup();
    render(<ExternalAiHarness />);

    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("Google Gemini")).toBeInTheDocument();
    expect(screen.getByText("GitHub Copilot")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /OpenAI/ }));
    await user.click(screen.getByRole("checkbox", { name: /Anthropic/ }));

    const anthropicProvider = screen.getByRole("group", {
      name: "Anthropic outside AI provider",
    });
    await user.type(
      within(anthropicProvider).getByPlaceholderText("Paste your provider key"),
      "test-anthropic-provider-value",
    );
    await user.click(within(anthropicProvider).getByRole("button", { name: "Up" }));

    const externalAi = JSON.parse(
      screen.getByTestId("external-ai-state").textContent ?? "{}",
    );
    const credentials = JSON.parse(
      screen.getByTestId("external-ai-credentials").textContent ?? "{}",
    );

    expect(externalAi).toMatchObject({
      enabled: true,
      provider: "anthropic",
      enabled_providers: ["anthropic", "open_ai"],
      require_payload_preview: true,
      redaction: { enabled: true },
    });
    expect(externalAi.provider_models).toEqual({});
    expect(JSON.stringify(externalAi)).not.toContain(
      "test-anthropic-provider-value",
    );
    expect(credentials.external_ai_anthropic_api_key).toBe(
      "test-anthropic-provider-value",
    );
  });
});
