import { describe, it, expect } from "vitest";
import {
  buildSetupConfigFromCareerProfile,
  findCareerProfileById,
} from "./careerProfileSetup";
import { CAREER_PROFILES } from "../../shared/careerProfileTaxonomy";

describe("career profile setup", () => {
  describe("CAREER_PROFILES", () => {
    it("contains career profiles", () => {
      expect(CAREER_PROFILES.length).toBeGreaterThan(0);
    });

    it("each profile has required fields", () => {
      for (const profile of CAREER_PROFILES) {
        expect(profile.id).toBeDefined();
        expect(profile.name).toBeDefined();
        expect(profile.description).toBeDefined();
        expect(profile.titleAllowlist).toBeDefined();
        expect(profile.titleBlocklist).toBeDefined();
        expect(profile.keywordsBoost).toBeDefined();
        expect(profile.keywordsExclude).toBeDefined();
        expect(profile.locationPreferences).toBeDefined();
        expect(profile.sampleTitles).toBeDefined();
      }
    });

    it("includes software engineering profile", () => {
      const swProfile = CAREER_PROFILES.find(p => p.id === "software-engineering");
      expect(swProfile).toBeDefined();
      expect(swProfile?.name).toBe("Software & Tech");
    });

    it("includes common non-technical paths", () => {
      expect(findCareerProfileById("office-administration")?.name).toBe("Office & Admin");
      expect(findCareerProfileById("retail-hospitality")?.name).toBe("Retail & Hospitality");
      expect(findCareerProfileById("trades-field-service")?.name).toBe("Trades & Field");
    });
  });

  describe("findCareerProfileById", () => {
    it("returns profile for valid ID", () => {
      const profile = findCareerProfileById("software-engineering");
      expect(profile).toBeDefined();
      expect(profile?.id).toBe("software-engineering");
    });

    it("returns undefined for invalid ID", () => {
      const profile = findCareerProfileById("non-existent-profile");
      expect(profile).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      const profile = findCareerProfileById("");
      expect(profile).toBeUndefined();
    });
  });

  describe("buildSetupConfigFromCareerProfile", () => {
    it("converts profile to config format", () => {
      const profile = findCareerProfileById("software-engineering");
      expect(profile).toBeDefined();
      if (!profile) return;

      const config = buildSetupConfigFromCareerProfile(profile);

      expect(config.title_allowlist).toEqual(profile.titleAllowlist);
      expect(config.title_blocklist).toEqual(profile.titleBlocklist);
      expect(config.keywords_boost).toEqual(profile.keywordsBoost);
      expect(config.keywords_exclude).toEqual(profile.keywordsExclude);
      expect(config.location_preferences.allow_remote).toBe(
        profile.locationPreferences.allow_remote,
      );
      expect(config.location_preferences.allow_hybrid).toBe(
        profile.locationPreferences.allow_hybrid,
      );
      expect(config.location_preferences.allow_onsite).toBe(
        profile.locationPreferences.allow_onsite,
      );
      expect(config.location_preferences.cities).toEqual([]);
      expect(config.salary_floor_usd).toBe(profile.salaryFloor);
      expect(config.alerts.desktop.enabled).toBe(false);
      expect(config.alerts.desktop.play_sound).toBe(false);
      expect(config.alerts.desktop.show_when_focused).toBe(false);
      expect(config.remoteok.enabled).toBe(false);
      expect(config.hn_hiring.enabled).toBe(false);
      expect(config.weworkremotely.enabled).toBe(false);
      expect(config.simplyhired.enabled).toBe(false);
    });

    it("keeps broad profiles off tech-heavy sources by default", () => {
      for (const id of [
        "healthcare",
        "office-administration",
        "retail-hospitality",
        "trades-field-service",
      ]) {
        const profile = findCareerProfileById(id);
        expect(profile).toBeDefined();
        if (!profile) continue;

        const config = buildSetupConfigFromCareerProfile(profile);

        expect(config.remoteok.enabled).toBe(false);
        expect(config.hn_hiring.enabled).toBe(false);
        expect(config.weworkremotely.enabled).toBe(false);
        expect(config.simplyhired.enabled).toBe(false);
      }
    });

    it("keeps healthcare support roles from matching preset avoid terms", () => {
      const profile = findCareerProfileById("healthcare");
      expect(profile).toBeDefined();
      if (!profile) return;

      const config = buildSetupConfigFromCareerProfile(profile);

      expect(config.title_allowlist).toEqual(
        expect.arrayContaining([
          "Medical Assistant",
          "Patient Care Assistant",
          "Home Health Aide",
          "Certified Nursing Assistant",
        ]),
      );
      expect(config.title_blocklist).not.toContain("Assistant");
      expect(config.title_blocklist).not.toContain("Aide");
      expect(config.title_blocklist).toEqual(expect.arrayContaining(["Volunteer", "Student"]));
    });

    it("keeps product and design profiles off tech-heavy sources by default", () => {
      const profile = findCareerProfileById("product-management");
      expect(profile).toBeDefined();
      if (!profile) return;

      const config = buildSetupConfigFromCareerProfile(profile);

      expect(config.remoteok.enabled).toBe(false);
      expect(config.hn_hiring.enabled).toBe(false);
      expect(config.weworkremotely.enabled).toBe(false);
    });

    it("creates independent copies of arrays", () => {
      const profile = findCareerProfileById("software-engineering");
      expect(profile).toBeDefined();
      if (!profile) return;

      const config = buildSetupConfigFromCareerProfile(profile);

      // Modify config arrays
      config.title_allowlist.push("Test Title");
      config.keywords_boost.push("Test Keyword");

      // Original profile should be unchanged
      expect(profile.titleAllowlist).not.toContain("Test Title");
      expect(profile.keywordsBoost).not.toContain("Test Keyword");
    });
  });

});
