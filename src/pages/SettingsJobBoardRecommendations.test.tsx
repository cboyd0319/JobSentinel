import { renderHook } from "@testing-library/react";
import type { Dispatch, SetStateAction } from "react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_EXTERNAL_AI_CONFIG, type Config } from "./SettingsConfig";
import { useJobBoardRecommendations } from "./SettingsJobBoardRecommendations";

function makeConfig(overrides: Partial<Config> = {}): Config {
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
    ...overrides,
  };
}

function renderRecommendations(config: Config) {
  const setConfig = vi.fn() as unknown as Dispatch<
    SetStateAction<Config | null>
  >;
  return renderHook(() => useJobBoardRecommendations(config, setConfig)).result
    .current;
}

describe("useJobBoardRecommendations", () => {
  it("recommends startup sources from shared startup intent terms", () => {
    const recommendations = renderRecommendations(
      makeConfig({ keywords_boost: ["seed stage operations"] }),
    );

    expect(recommendations.map((item) => item.board)).toContain("YC Startups");
  });

  it("recommends USAJobs from shared government intent terms", () => {
    const recommendations = renderRecommendations(
      makeConfig({ title_allowlist: ["Public Sector Program Analyst"] }),
    );

    expect(recommendations.map((item) => item.board)).toContain("USAJobs");
  });

  it("recommends BuiltIn for technical searches in shared tech city markets", () => {
    const recommendations = renderRecommendations(
      makeConfig({
        title_allowlist: ["Software Engineer"],
        location_preferences: {
          allow_remote: false,
          allow_hybrid: true,
          allow_onsite: true,
          cities: ["Austin"],
        },
      }),
    );

    expect(recommendations.map((item) => item.board)).toContain("BuiltIn");
  });
});
