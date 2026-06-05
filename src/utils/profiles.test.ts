import { describe, it, expect } from "vitest";
import {
  CAREER_PROFILES,
  getProfileById,
  getSearchSourceDefaults,
  profileToConfig,
  searchLooksTechFocused,
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

    it("includes common non-technical paths", () => {
      expect(getProfileById("office-administration")?.name).toBe("Office & Admin");
      expect(getProfileById("retail-hospitality")?.name).toBe("Retail & Hospitality");
      expect(getProfileById("trades-field-service")?.name).toBe("Trades & Field");
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
      if (!profile) return;

      const config = profileToConfig(profile);

      expect(config.title_allowlist).toEqual(profile.titleAllowlist);
      expect(config.title_blocklist).toEqual(profile.titleBlocklist);
      expect(config.keywords_boost).toEqual(profile.keywordsBoost);
      expect(config.keywords_exclude).toEqual(profile.keywordsExclude);
      expect(config.location_preferences.allow_remote).toBe(true);
      expect(config.location_preferences.allow_hybrid).toBe(true);
      expect(config.location_preferences.allow_onsite).toBe(true);
      expect(config.location_preferences.cities).toEqual([]);
      expect(config.salary_floor_usd).toBe(0);
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
        const profile = getProfileById(id);
        expect(profile).toBeDefined();
        if (!profile) continue;

        const config = profileToConfig(profile);

        expect(config.remoteok.enabled).toBe(false);
        expect(config.hn_hiring.enabled).toBe(false);
        expect(config.weworkremotely.enabled).toBe(false);
        expect(config.simplyhired.enabled).toBe(false);
      }
    });

    it("keeps healthcare support roles from matching preset avoid terms", () => {
      const profile = getProfileById("healthcare");
      expect(profile).toBeDefined();
      if (!profile) return;

      const config = profileToConfig(profile);

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
      const profile = getProfileById("product-management");
      expect(profile).toBeDefined();
      if (!profile) return;

      const config = profileToConfig(profile);

      expect(config.remoteok.enabled).toBe(false);
      expect(config.hn_hiring.enabled).toBe(false);
      expect(config.weworkremotely.enabled).toBe(false);
    });

    it("creates independent copies of arrays", () => {
      const profile = getProfileById("software-engineering");
      expect(profile).toBeDefined();
      if (!profile) return;

      const config = profileToConfig(profile);

      // Modify config arrays
      config.title_allowlist.push("Test Title");
      config.keywords_boost.push("Test Keyword");

      // Original profile should be unchanged
      expect(profile.titleAllowlist).not.toContain("Test Title");
      expect(profile.keywordsBoost).not.toContain("Test Keyword");
    });
  });

  describe("source defaults", () => {
    it("recognizes technical and non-technical search terms", () => {
      expect(searchLooksTechFocused(["Software Engineer"])).toBe(true);
      expect(searchLooksTechFocused(["Frontend Engineer", "React"])).toBe(true);
      expect(searchLooksTechFocused(["Technical Product Manager"])).toBe(false);
      expect(searchLooksTechFocused(["Sales Engineer"])).toBe(false);
      expect(searchLooksTechFocused(["Software Sales Manager"])).toBe(false);
      expect(searchLooksTechFocused(["Software Implementation Specialist"])).toBe(false);
      expect(searchLooksTechFocused(["Software Support Specialist"])).toBe(false);
      expect(searchLooksTechFocused(["Curriculum Developer"])).toBe(false);
      expect(searchLooksTechFocused(["Support Engineer"])).toBe(false);
      expect(searchLooksTechFocused(["Customer Success Engineer"])).toBe(false);
      expect(searchLooksTechFocused(["Accountant", "SQL"])).toBe(false);
      expect(searchLooksTechFocused(["Operations Manager", "Python"])).toBe(false);
      expect(searchLooksTechFocused(["Sales Manager", "AWS"])).toBe(false);
      expect(searchLooksTechFocused(["Product Designer"])).toBe(false);
      expect(searchLooksTechFocused(["Office Manager", "Scheduling"])).toBe(false);
      expect(searchLooksTechFocused(["Medical Assistant", "EMR"])).toBe(false);
      expect(searchLooksTechFocused(["Store Manager", "Point of Sale"])).toBe(false);
      expect(searchLooksTechFocused(["Maintenance Technician", "Work Orders"])).toBe(false);
      expect(searchLooksTechFocused(["React Developer"])).toBe(true);
    });

    it("enables tech-heavy source defaults only for technical searches", () => {
      expect(
        getSearchSourceDefaults({
          titles: ["Software Engineer"],
          keywords: ["React"],
          allowRemote: true,
        }),
      ).toEqual({
        remoteokEnabled: true,
        hnHiringEnabled: true,
        weworkremotelyEnabled: true,
      });
      expect(
        getSearchSourceDefaults({
          titles: ["Office Manager"],
          keywords: ["Scheduling"],
          allowRemote: true,
        }),
      ).toEqual({
        remoteokEnabled: false,
        hnHiringEnabled: false,
        weworkremotelyEnabled: false,
      });
      expect(
        getSearchSourceDefaults({
          titles: [
            "Sales Engineer",
            "Software Sales Manager",
            "Curriculum Developer",
            "Support Engineer",
          ],
          keywords: ["customer onboarding", "training"],
          allowRemote: true,
        }),
      ).toEqual({
        remoteokEnabled: false,
        hnHiringEnabled: false,
        weworkremotelyEnabled: false,
      });
      expect(
        getSearchSourceDefaults({
          titles: ["Accountant"],
          keywords: ["SQL", "Excel"],
          allowRemote: true,
        }),
      ).toEqual({
        remoteokEnabled: false,
        hnHiringEnabled: false,
        weworkremotelyEnabled: false,
      });
    });
  });
});
