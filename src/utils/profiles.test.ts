import { describe, it, expect } from "vitest";
import {
  CAREER_PROFILES,
  getProfileById,
  profileToConfig,
} from "./profiles";

describe("profiles", () => {
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
  });

  describe("getProfileById", () => {
    it("returns profile for valid ID", () => {
      const profile = getProfileById("software-engineering");
      expect(profile).toBeDefined();
      expect(profile?.id).toBe("software-engineering");
    });

    it("returns undefined for invalid ID", () => {
      const profile = getProfileById("non-existent-profile");
      expect(profile).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      const profile = getProfileById("");
      expect(profile).toBeUndefined();
    });
  });

  describe("profileToConfig", () => {
    it("converts profile to config format", () => {
      const profile = getProfileById("software-engineering");
      expect(profile).toBeDefined();

      const config = profileToConfig(profile!);

      expect(config.title_allowlist).toEqual(profile!.titleAllowlist);
      expect(config.title_blocklist).toEqual(profile!.titleBlocklist);
      expect(config.keywords_boost).toEqual(profile!.keywordsBoost);
      expect(config.keywords_exclude).toEqual(profile!.keywordsExclude);
      expect(config.location_preferences.allow_remote).toBe(profile!.locationPreferences.allow_remote);
      expect(config.location_preferences.allow_hybrid).toBe(profile!.locationPreferences.allow_hybrid);
      expect(config.location_preferences.allow_onsite).toBe(profile!.locationPreferences.allow_onsite);
      expect(config.location_preferences.cities).toEqual([]);
    });

    it("creates independent copies of arrays", () => {
      const profile = getProfileById("software-engineering");
      expect(profile).toBeDefined();

      const config = profileToConfig(profile!);

      // Modify config arrays
      config.title_allowlist.push("Test Title");
      config.keywords_boost.push("Test Keyword");

      // Original profile should be unchanged
      expect(profile!.titleAllowlist).not.toContain("Test Title");
      expect(profile!.keywordsBoost).not.toContain("Test Keyword");
    });
  });
});
