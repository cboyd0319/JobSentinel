import { describe, expect, it } from "vitest";
import type { Config } from "./SettingsConfig";
import {
  createSettingsLocalDataBackup,
  isSettingsLocalDataBackup,
  parseSettingsBackupImport,
} from "./settingsLocalDataBackup";

function makeConfig(): Config {
  return {
    title_allowlist: [],
    title_blocklist: [],
    keywords_boost: ["customer support"],
    keywords_exclude: [],
    location_preferences: {
      allow_remote: true,
      allow_hybrid: true,
      allow_onsite: true,
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
    use_resume_matching: false,
  };
}

function makeTemplate() {
  return {
    id: "template-1",
    name: "General cover letter",
    content: "Hello hiring team",
    category: "general",
    createdAt: "2026-06-19T12:00:00Z",
    updatedAt: "2026-06-19T12:00:00Z",
  };
}

function makeSavedSearch() {
  return {
    id: "search-1",
    name: "Remote coordinator",
    sortBy: "score",
    scoreFilter: "all",
    sourceFilter: "all",
    remoteFilter: "all",
    bookmarkFilter: "all",
    notesFilter: "all",
    postedDateFilter: null,
    salaryMinFilter: 50000,
    salaryMaxFilter: null,
    ghostFilter: null,
    textSearch: "coordinator",
    createdAt: "2026-06-19T12:00:00Z",
    lastUsedAt: null,
  };
}

describe("settings local-data backup parsing", () => {
  it("creates and accepts a local-data backup bundle", () => {
    const backup = createSettingsLocalDataBackup(
      makeConfig(),
      [makeTemplate()],
      [makeSavedSearch()],
      "2026-06-19T12:00:00Z",
    );

    expect(isSettingsLocalDataBackup(backup)).toBe(true);
    expect(parseSettingsBackupImport(backup)).toEqual({
      type: "localData",
      backup,
    });
  });

  it("accepts legacy settings-only backups", () => {
    const settings = makeConfig();

    expect(parseSettingsBackupImport(settings)).toEqual({
      type: "settings",
      settings,
    });
  });

  it("rejects unknown JSON", () => {
    expect(parseSettingsBackupImport({ setting: "value" })).toBeNull();
  });

  it("rejects malformed local-data backup rows", () => {
    const backup = createSettingsLocalDataBackup(
      makeConfig(),
      [makeTemplate()],
      [makeSavedSearch()],
      "2026-06-19T12:00:00Z",
    );

    expect(
      parseSettingsBackupImport({
        ...backup,
        savedSearches: [
          {
            ...makeSavedSearch(),
            salaryMinFilter: 10.5,
          },
        ],
      }),
    ).toBeNull();
    expect(
      parseSettingsBackupImport({
        ...backup,
        coverLetterTemplates: [
          {
            ...makeTemplate(),
            createdAt: null,
          },
        ],
      }),
    ).toBeNull();
  });
});
