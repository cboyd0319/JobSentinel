import { describe, it, expect } from "vitest";
import {
  DEFAULT_PREFERENCES as REAL_DEFAULT_PREFERENCES,
  normalizeNotificationPreferences,
  shouldNotifyForJob,
  type NotificationPreferences,
  type JobForNotification,
} from "../../../shared/notificationPreferences";
import { DEFAULT_PREFS } from "./notificationPreferences.testFixtures";

describe("shouldNotifyForJob", () => {
  it("keeps backend-required Indeed source in default preferences", () => {
    expect("indeed" in REAL_DEFAULT_PREFERENCES).toBe(true);
  });

  it("starts source alert sounds off by default", () => {
    expect(REAL_DEFAULT_PREFERENCES.indeed.soundEnabled).toBe(false);
    expect(REAL_DEFAULT_PREFERENCES.greenhouse.soundEnabled).toBe(false);
    expect(REAL_DEFAULT_PREFERENCES.lever.soundEnabled).toBe(false);
    expect(REAL_DEFAULT_PREFERENCES.jobswithgpt.soundEnabled).toBe(false);
  });

  it("normalizes older source alert settings without sound to quiet", () => {
    const legacyPrefs = {
      ...DEFAULT_PREFS,
      indeed: { enabled: true, minScoreThreshold: 70 },
      greenhouse: { enabled: true, minScoreThreshold: 80 },
      lever: { enabled: true, minScoreThreshold: 80 },
      jobswithgpt: { enabled: true, minScoreThreshold: 75 },
    } as NotificationPreferences;

    const normalized = normalizeNotificationPreferences(legacyPrefs);

    expect(normalized.indeed.soundEnabled).toBe(false);
    expect(normalized.greenhouse.soundEnabled).toBe(false);
    expect(normalized.lever.soundEnabled).toBe(false);
    expect(normalized.jobswithgpt.soundEnabled).toBe(false);
  });

  describe("global settings", () => {
    it("returns false when global.enabled is false", () => {
      const prefs = {
        ...DEFAULT_PREFS,
        global: { ...DEFAULT_PREFS.global, enabled: false },
      };
      expect(shouldNotifyForJob("indeed", 0.9, prefs)).toBe(false);
    });

    it("returns true when global.enabled is true and score meets threshold", () => {
      expect(shouldNotifyForJob("indeed", 0.8, DEFAULT_PREFS)).toBe(true);
    });
  });

  describe("source-specific settings", () => {
    it("returns false when source is disabled", () => {
      const prefs = {
        ...DEFAULT_PREFS,
        indeed: { enabled: false, minScoreThreshold: 70, soundEnabled: true },
      };
      expect(shouldNotifyForJob("indeed", 0.9, prefs)).toBe(false);
    });

    it("does not alert for LinkedIn because it is user-opened search links only", () => {
      const legacySource = "linkedin";
      const legacyPrefs = {
        ...DEFAULT_PREFS,
        [legacySource]: {
          enabled: true,
          minScoreThreshold: 70,
          soundEnabled: true,
        },
      };

      expect(shouldNotifyForJob(legacySource, 0.95, legacyPrefs)).toBe(false);
    });

    it("returns false when score is below threshold", () => {
      expect(shouldNotifyForJob("indeed", 0.5, DEFAULT_PREFS)).toBe(false); // 50% < 70%
    });

    it("returns true when score meets threshold", () => {
      expect(shouldNotifyForJob("indeed", 0.75, DEFAULT_PREFS)).toBe(true); // 75% >= 70%
    });

    it("handles different source thresholds", () => {
      // Indeed threshold is 70%, Greenhouse is 80%
      expect(shouldNotifyForJob("indeed", 0.75, DEFAULT_PREFS)).toBe(true);
      expect(shouldNotifyForJob("greenhouse", 0.75, DEFAULT_PREFS)).toBe(false);
    });

    it("handles unknown sources", () => {
      expect(shouldNotifyForJob("unknown", 0.75, DEFAULT_PREFS)).toBe(true);
      expect(shouldNotifyForJob("unknown", 0.65, DEFAULT_PREFS)).toBe(false);
    });

    it("normalizes source names (lowercase, no spaces)", () => {
      expect(shouldNotifyForJob("Indeed", 0.8, DEFAULT_PREFS)).toBe(true);
      expect(shouldNotifyForJob("INDEED", 0.8, DEFAULT_PREFS)).toBe(true);
    });
  });

  describe("advanced filters - keywords", () => {
    it("filters by include keywords", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          includeKeywords: ["Senior", "Lead"],
        },
      };
      const job: JobForNotification = {
        title: "Lead Care Coordinator",
        company: "CareBridge Services",
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, job)).toBe(true);

      const juniorJob: JobForNotification = {
        title: "Care Coordinator",
        company: "CareBridge Services",
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, juniorJob)).toBe(false);
    });

    it("filters by exclude keywords", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          excludeKeywords: ["Junior", "Intern"],
        },
      };
      const job: JobForNotification = {
        title: "Junior Care Coordinator",
        company: "CareBridge Services",
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, job)).toBe(false);

      const leadJob: JobForNotification = {
        title: "Lead Care Coordinator",
        company: "CareBridge Services",
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, leadJob)).toBe(true);
    });

    it("keyword matching is case-insensitive", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          excludeKeywords: ["INTERN"],
        },
      };
      const job: JobForNotification = {
        title: "Patient Care Intern",
        company: "CareBridge Services",
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, job)).toBe(false);
    });
  });

  describe("advanced filters - salary", () => {
    it("filters by minimum salary", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          minSalary: 100, // $100k
        },
      };

      // Job with salary below minimum
      const lowPayJob: JobForNotification = {
        title: "Care Coordinator",
        company: "CareBridge Services",
        salary_max: 80000,
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, lowPayJob)).toBe(false);

      // Job with salary meeting minimum
      const goodPayJob: JobForNotification = {
        title: "Care Coordinator",
        company: "CareBridge Services",
        salary_max: 120000,
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, goodPayJob)).toBe(true);
    });

    it("uses salary_max over salary_min", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          minSalary: 100,
        },
      };

      const job: JobForNotification = {
        title: "Care Coordinator",
        company: "CareBridge Services",
        salary_min: 80000,
        salary_max: 120000,
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, job)).toBe(true);
    });

    it("passes jobs without salary info when salary filter is set", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          minSalary: 100,
        },
      };

      const jobNoSalary: JobForNotification = {
        title: "Care Coordinator",
        company: "CareBridge Services",
      };
      // Jobs with 0 or no salary info pass the filter
      expect(shouldNotifyForJob("indeed", 0.8, prefs, jobNoSalary)).toBe(true);
    });
  });

  describe("advanced filters - remote", () => {
    it("filters remote-only jobs", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          remoteOnly: true,
        },
      };

      const remoteJob: JobForNotification = {
        title: "Care Coordinator",
        company: "CareBridge Services",
        remote: true,
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, remoteJob)).toBe(true);

      const onsiteJob: JobForNotification = {
        title: "Care Coordinator",
        company: "CareBridge Services",
        remote: false,
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, onsiteJob)).toBe(false);
    });

    it("detects remote from location field", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          remoteOnly: true,
        },
      };

      const job: JobForNotification = {
        title: "Care Coordinator",
        company: "CareBridge Services",
        location: "Remote - US",
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, job)).toBe(true);
    });

    it("detects remote from title", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          remoteOnly: true,
        },
      };

      const job: JobForNotification = {
        title: "Remote Care Coordinator",
        company: "CareBridge Services",
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, job)).toBe(true);
    });
  });

  describe("advanced filters - company lists", () => {
    it("filters by included companies", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          includedCompanies: ["CareBridge", "Neighborhood Works"],
        },
      };

      const favoriteJob: JobForNotification = {
        title: "Care Coordinator",
        company: "CareBridge Services",
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, favoriteJob)).toBe(true);

      const otherJob: JobForNotification = {
        title: "Care Coordinator",
        company: "Random Employer",
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, otherJob)).toBe(false);
    });

    it("filters by excluded companies", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          excludedCompanies: ["BadEmployer", "AvoidMe"],
        },
      };

      const badJob: JobForNotification = {
        title: "Care Coordinator",
        company: "BadEmployer",
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, badJob)).toBe(false);

      const goodJob: JobForNotification = {
        title: "Care Coordinator",
        company: "GoodCompany",
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, goodJob)).toBe(true);
    });

    it("company matching is case-insensitive", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          includedCompanies: ["carebridge"],
        },
      };

      const job: JobForNotification = {
        title: "Care Coordinator",
        company: "CAREBRIDGE SERVICES",
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, job)).toBe(true);
    });

    it("company matching is partial", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          includedCompanies: ["carebridge"],
        },
      };

      const job: JobForNotification = {
        title: "Care Coordinator",
        company: "CareBridge Health LLC",
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, job)).toBe(true);
    });
  });

  describe("combined filters", () => {
    it("applies all filters together", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          includeKeywords: ["Lead"],
          excludeKeywords: ["Intern"],
          minSalary: 70,
          remoteOnly: true,
          includedCompanies: ["CareBridge"],
          excludedCompanies: [],
        },
      };

      // Job that passes all filters
      const perfectJob: JobForNotification = {
        title: "Lead Remote Care Coordinator",
        company: "CareBridge Services",
        salary_max: 85000,
        remote: true,
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, perfectJob)).toBe(true);

      // Job failing include keyword
      const noKeywordJob: JobForNotification = {
        title: "Care Coordinator",
        company: "CareBridge Services",
        salary_max: 85000,
        remote: true,
      };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, noKeywordJob)).toBe(
        false,
      );
    });
  });
});
