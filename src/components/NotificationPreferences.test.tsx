import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  NotificationPreferences as NotificationPreferencesComponent,
} from "./NotificationPreferences";
import {
  DEFAULT_PREFERENCES as REAL_DEFAULT_PREFERENCES,
  normalizeNotificationPreferences,
  shouldNotifyForJob,
  type NotificationPreferences,
  type JobForNotification,
} from "../utils/notificationPreferences";

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock useToast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};
vi.mock("../contexts", () => ({
  useToast: () => mockToast,
}));

const DEFAULT_PREFS: NotificationPreferences = {
  linkedin: { enabled: false, minScoreThreshold: 70, soundEnabled: false },
  indeed: { enabled: true, minScoreThreshold: 70, soundEnabled: false },
  greenhouse: { enabled: true, minScoreThreshold: 80, soundEnabled: false },
  lever: { enabled: true, minScoreThreshold: 80, soundEnabled: false },
  jobswithgpt: { enabled: true, minScoreThreshold: 75, soundEnabled: false },
  global: {
    enabled: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    quietHoursEnabled: false,
  },
  advancedFilters: {
    includeKeywords: [],
    excludeKeywords: [],
    minSalary: null,
    remoteOnly: false,
    companyWhitelist: [],
    companyBlacklist: [],
  },
};

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
      const prefs = { ...DEFAULT_PREFS, global: { ...DEFAULT_PREFS.global, enabled: false } };
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
        [legacySource]: { enabled: true, minScoreThreshold: 70, soundEnabled: true },
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
      const job: JobForNotification = { title: "Lead Care Coordinator", company: "CareBridge Services" };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, job)).toBe(true);

      const juniorJob: JobForNotification = { title: "Care Coordinator", company: "CareBridge Services" };
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
      const job: JobForNotification = { title: "Junior Care Coordinator", company: "CareBridge Services" };
      expect(shouldNotifyForJob("indeed", 0.8, prefs, job)).toBe(false);

      const leadJob: JobForNotification = { title: "Lead Care Coordinator", company: "CareBridge Services" };
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
      const job: JobForNotification = { title: "Patient Care Intern", company: "CareBridge Services" };
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
    it("filters by favorite companies (whitelist)", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          companyWhitelist: ["CareBridge", "Neighborhood Works"],
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

    it("filters by companies to skip (blacklist)", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          companyBlacklist: ["BadEmployer", "AvoidMe"],
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
          companyWhitelist: ["carebridge"],
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
          companyWhitelist: ["carebridge"],
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
          companyWhitelist: ["CareBridge"],
          companyBlacklist: [],
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
      expect(shouldNotifyForJob("indeed", 0.8, prefs, noKeywordJob)).toBe(false);
    });
  });
});

describe("NotificationPreferences Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });

  describe("loading state", () => {
    it("shows loading text initially", async () => {
      mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<NotificationPreferencesComponent />);

      expect(screen.getByText("Loading alert rules...")).toBeInTheDocument();
    });
  });

  describe("loaded state", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue(DEFAULT_PREFS);
    });

    it("renders title", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Job Alert Rules")).toBeInTheDocument();
      });
    });

    it("renders subtitle", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(
          screen.getByText("Use alerts for jobs worth checking. Quiet hours protect your time."),
        ).toBeInTheDocument();
      });
    });

    it("uses plain alert-filter copy instead of score-threshold wording", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getAllByText("How picky alerts are:").length).toBeGreaterThan(0);
      });

      expect(screen.queryByText("Match strength:")).not.toBeInTheDocument();
      expect(screen.queryByText("Alert selectivity:")).not.toBeInTheDocument();
      expect(screen.queryByText("Quality:")).not.toBeInTheDocument();
      expect(screen.queryByText(/score threshold/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/above this match score/i)).not.toBeInTheDocument();
    });

    it("uses plain alert-pickiness labels instead of raw percentages", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(
          screen.getByRole("slider", { name: "How picky Indeed alerts are" }),
        ).toBeInTheDocument();
      });

      expect(screen.getAllByText("Picky").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Very picky").length).toBeGreaterThan(0);
      expect(screen.queryByText("70%")).not.toBeInTheDocument();
      expect(screen.queryByText("75%")).not.toBeInTheDocument();
      expect(screen.queryByText("80%")).not.toBeInTheDocument();
    });

    it("renders all job alerts toggle", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("All job alerts")).toBeInTheDocument();
        expect(screen.getByText("Turn every job alert on or off")).toBeInTheDocument();
        expect(
          screen.getByRole("checkbox", { name: "All job alerts" }),
        ).toBeInTheDocument();
        expect(screen.queryByText(/Master switch/i)).not.toBeInTheDocument();
      });
    });

    it("renders Quiet Hours section", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Quiet Hours")).toBeInTheDocument();
        expect(
          screen.getByRole("checkbox", { name: "Quiet Hours" }),
        ).toBeInTheDocument();
      });
    });

    it("renders per-source settings", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Alert sources")).toBeInTheDocument();
        expect(
          screen.getByText(/Choose which job sources can send alerts/),
        ).toBeInTheDocument();
        expect(screen.getByText(/Other job boards that are turned on/)).toBeInTheDocument();
        expect(screen.queryByText(/enabled job boards/i)).not.toBeInTheDocument();
        expect(screen.queryByText("Source Alert Rules")).not.toBeInTheDocument();
        expect(screen.queryByText("Which Jobs Alert You")).not.toBeInTheDocument();
        expect(screen.queryByText(/interrupt you/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Detailed rules currently apply/i)).not.toBeInTheDocument();
        expect(screen.queryByText("LinkedIn")).not.toBeInTheDocument();
        expect(screen.getByText("Indeed")).toBeInTheDocument();
        expect(screen.getByText("Greenhouse")).toBeInTheDocument();
        expect(screen.getByText("Lever")).toBeInTheDocument();
        expect(screen.getByText("Connected job source")).toBeInTheDocument();
        expect(screen.queryByText("JobsWithGPT")).not.toBeInTheDocument();
        expect(
          screen.getByRole("checkbox", { name: "Turn Indeed alerts on or off" }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("checkbox", { name: "Turn Indeed alert sound on or off" }),
        ).not.toBeChecked();
      });
    });

    it("renders Extra alert rules section", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Extra alert rules")).toBeInTheDocument();
      });
    });
  });

  describe("global toggle", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue(DEFAULT_PREFS);
    });

    it("disables per-source settings when global is off", async () => {
      mockInvoke.mockResolvedValue({
        ...DEFAULT_PREFS,
        global: { ...DEFAULT_PREFS.global, enabled: false },
      });

      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        // The per-source section should have opacity class when disabled
        const perSourceSection = screen.getByText("Alert sources").parentElement;
        expect(perSourceSection?.className).toContain("opacity-50");
      });
    });
  });

  describe("quiet hours", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue({
        ...DEFAULT_PREFS,
        global: { ...DEFAULT_PREFS.global, quietHoursEnabled: true },
      });
    });

    it("shows time inputs when quiet hours is enabled", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("From")).toBeInTheDocument();
        expect(screen.getByText("to")).toBeInTheDocument();
      });
    });

    it("hides time inputs when quiet hours is disabled", async () => {
      mockInvoke.mockResolvedValue(DEFAULT_PREFS); // quietHoursEnabled: false

      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Quiet Hours")).toBeInTheDocument();
      });

      expect(screen.queryByText("From")).not.toBeInTheDocument();
    });
  });

  describe("keyword filters", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue(DEFAULT_PREFS);
    });

    it("renders include keywords input", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Alert only when the job title has")).toBeInTheDocument();
        expect(screen.queryByText("Only notify if title contains")).not.toBeInTheDocument();
      });
    });

    it("renders exclude keywords input", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Do not alert when the job title has")).toBeInTheDocument();
        expect(screen.queryByText("Never notify if title contains")).not.toBeInTheDocument();
      });
    });

    it("renders minimum salary input", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Minimum yearly pay")).toBeInTheDocument();
        expect(screen.getByText("per year")).toBeInTheDocument();
      });
      expect(screen.getByPlaceholderText("e.g., 90000")).toBeInTheDocument();
      expect(screen.queryByText("thousand per year")).not.toBeInTheDocument();
      expect(screen.queryByText("Minimum Salary")).not.toBeInTheDocument();
      expect(screen.queryByText("K/year")).not.toBeInTheDocument();
    });

    it("lets users enter full yearly dollars while saving the existing internal value", async () => {
      mockInvoke
        .mockResolvedValueOnce(DEFAULT_PREFS)
        .mockResolvedValueOnce(true);

      render(<NotificationPreferencesComponent />);

      const input = await screen.findByLabelText("Minimum yearly pay");
      fireEvent.change(input, { target: { value: "90000" } });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          "save_notification_preferences",
          expect.objectContaining({
            prefs: expect.objectContaining({
              advancedFilters: expect.objectContaining({
                minSalary: 90,
              }),
            }),
          }),
        );
      });
    });

    it("renders remote only toggle", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Remote jobs only")).toBeInTheDocument();
        expect(
          screen.getByRole("checkbox", { name: "Remote jobs only" }),
        ).toBeInTheDocument();
        expect(screen.queryByText("Remote Only")).not.toBeInTheDocument();
      });
    });
  });

  describe("company filters", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue(DEFAULT_PREFS);
    });

    it("renders favorite companies section", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Companies you want alerts from")).toBeInTheDocument();
        expect(screen.queryByText("Favorite Companies")).not.toBeInTheDocument();
      });
    });

    it("renders companies to skip section", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Companies to skip")).toBeInTheDocument();
        expect(screen.queryByText("Companies to Skip")).not.toBeInTheDocument();
      });
    });
  });

  describe("saving", () => {
    beforeEach(() => {
      mockInvoke
        .mockResolvedValueOnce(DEFAULT_PREFS) // initial load
        .mockResolvedValue(true); // saves
    });

    it("shows Saved badge after changes", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("All job alerts")).toBeInTheDocument();
      });

      // Toggle the global switch
      const toggles = screen.getAllByRole("checkbox");
      const globalToggle = toggles[0]; // First toggle is the global one
      fireEvent.click(globalToggle);

      await waitFor(() => {
        expect(screen.getByText("Saved")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("does not show default alert rules when loading saved rules fails", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Load failed"));

      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(
          screen.getByText("Could not load alert rules. Your saved choices were not changed."),
        ).toBeInTheDocument();
      });

      expect(screen.getByText("Try again before changing alert rules.")).toBeInTheDocument();
      expect(screen.queryByText("All job alerts")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    it("shows error toast when save fails", async () => {
      mockInvoke
        .mockResolvedValueOnce(DEFAULT_PREFS) // initial load
        .mockRejectedValueOnce(new Error("Save failed")); // save fails

      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("All job alerts")).toBeInTheDocument();
      });

      // Toggle to trigger save
      const toggles = screen.getAllByRole("checkbox");
      fireEvent.click(toggles[0]);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Could not save alert settings",
          "Your last change was undone. Try again, or copy a safe support report if this keeps happening."
        );
      });
    });
  });
});
