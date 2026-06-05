import { describe, expect, it } from "vitest";
import {
  applyReviewVolumePreference,
  buildSetupSearchSummary,
  createDefaultSetupConfig,
  ghostConfigForFreshnessPreference,
  toResumeSkillSuggestions,
} from "./setupWizardPreferences";

describe("Setup Wizard preference helpers", () => {
  it("creates default first-run config without enabling external sources", () => {
    const config = createDefaultSetupConfig();

    expect(config.location_preferences).toMatchObject({
      allow_remote: true,
      allow_hybrid: false,
      allow_onsite: false,
      cities: [],
    });
    expect(config.alerts.desktop.enabled).toBe(true);
    expect(config.alerts.slack.webhook_url).toBe("");
    expect(config.remoteok.enabled).toBe(false);
    expect(config.hn_hiring.enabled).toBe(false);
    expect(config.weworkremotely.enabled).toBe(false);
    expect(config.ghost_config).toEqual(
      ghostConfigForFreshnessPreference("fresh_verified_first")
    );
  });

  it("applies review volume without changing enabled source choices", () => {
    const config = {
      ...createDefaultSetupConfig(),
      remoteok: { enabled: true, tags: ["healthcare"], limit: 50 },
      hn_hiring: { enabled: false, remote_only: true, limit: 100 },
      weworkremotely: { enabled: true, limit: 50 },
    };

    expect(applyReviewVolumePreference(config, "focused")).toMatchObject({
      immediate_alert_threshold: 0.92,
      remoteok: { enabled: true, tags: ["healthcare"], limit: 25 },
      hn_hiring: { enabled: false, remote_only: true, limit: 50 },
      weworkremotely: { enabled: true, limit: 25 },
    });
  });

  it("keeps resume skill suggestions local, deduped, and review-sized", () => {
    expect(
      toResumeSkillSuggestions([
        { skill_name: "Scheduling", source: "resume" },
        { skill_name: " scheduling ", source: "resume" },
        { skill_name: "Case management", source: "manual" },
        { skill_name: "", source: "resume" },
        { skill_name: "Client service", source: "resume" },
        { skill_name: "Calendar management", source: "resume" },
        { skill_name: "Inventory", source: "resume" },
        { skill_name: "Data entry", source: "resume" },
        { skill_name: "Front desk", source: "resume" },
        { skill_name: "Extra", source: "resume" },
      ])
    ).toEqual([
      "Scheduling",
      "Client service",
      "Calendar management",
      "Inventory",
      "Data entry",
      "Front desk",
    ]);
  });

  it("builds plain-language search summaries from config", () => {
    const config = {
      ...createDefaultSetupConfig(),
      title_allowlist: ["Office Coordinator"],
      keywords_boost: ["Scheduling"],
      keywords_exclude: ["night shift"],
      location_preferences: {
        allow_remote: true,
        allow_hybrid: true,
        allow_onsite: false,
        cities: ["Denver"],
      },
      salary_floor_usd: 60000,
      alerts: {
        ...createDefaultSetupConfig().alerts,
        desktop: {
          enabled: true,
          play_sound: false,
          show_when_focused: false,
        },
      },
    };

    expect(buildSetupSearchSummary(config, "balanced", "broad")).toMatchObject({
      titles: "Office Coordinator",
      wantedWork: "Scheduling",
      avoidedWork: "night shift",
      location: "remote, hybrid near Denver",
      freshness: "Balanced",
      reviewVolume: "Broad discovery",
      alerts: "Quiet desktop alerts; no sound",
      pay: "At least $60,000/year",
    });
  });
});
