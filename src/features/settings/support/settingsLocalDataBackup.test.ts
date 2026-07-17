import { describe, expect, it } from "vitest";
import type { Config } from "../config/SettingsConfig";
import {
  makeConfig as makeBaseConfig,
  makeSavedSearch,
} from "../SettingsPage.testFixtures";
import {
  createSettingsLocalDataBackup,
  isSettingsLocalDataBackup,
  parseSettingsBackupImport,
  SETTINGS_BACKUP_RECOVERY_GUIDE,
} from "./settingsLocalDataBackup";

function makeConfig(): Config {
  const config = makeBaseConfig();
  config.keywords_boost = ["customer support"];
  config.location_preferences.allow_hybrid = true;
  config.location_preferences.allow_onsite = true;
  config.salary_floor_usd = 0;
  return config;
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
    expect(backup.recoveryGuide).toEqual(SETTINGS_BACKUP_RECOVERY_GUIDE);
    expect(backup.recoveryGuide.portableIncludes).toEqual(
      expect.arrayContaining([
        "settings",
        "saved searches",
        "cover letter templates",
      ]),
    );
    expect(backup.recoveryGuide.notIncluded).toEqual(
      expect.arrayContaining([
        "saved connection details",
        "cookies and browser sessions",
        "local database records",
      ]),
    );
  });

  it("accepts legacy settings-only backups", () => {
    const settings = makeConfig();

    expect(parseSettingsBackupImport(settings)).toEqual({
      type: "settings",
      settings,
    });
  });

  it("accepts local-data backups created before recovery guidance existed", () => {
    const legacyBackup = createSettingsLocalDataBackup(
      makeConfig(),
      [makeTemplate()],
      [makeSavedSearch()],
      "2026-06-19T12:00:00Z",
    );
    delete (legacyBackup as { recoveryGuide?: unknown }).recoveryGuide;

    expect(isSettingsLocalDataBackup(legacyBackup)).toBe(true);
    expect(parseSettingsBackupImport(legacyBackup)).toEqual({
      type: "localData",
      backup: legacyBackup,
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
        recoveryGuide: {
          portableIncludes: ["settings"],
          notIncluded: "raw string",
        },
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
