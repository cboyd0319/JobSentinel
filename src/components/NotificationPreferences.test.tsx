import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  NotificationPreferences as NotificationPreferencesComponent,
  shouldNotifyForJob,
  type NotificationPreferences,
  type JobForNotification,
} from "./NotificationPreferences";

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
  linkedin: { enabled: true, minScoreThreshold: 70, soundEnabled: true },
  greenhouse: { enabled: true, minScoreThreshold: 80, soundEnabled: true },
  lever: { enabled: true, minScoreThreshold: 80, soundEnabled: true },
  jobswithgpt: { enabled: true, minScoreThreshold: 75, soundEnabled: true },
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
  describe("global settings", () => {
    it("returns false when global.enabled is false", () => {
      const prefs = { ...DEFAULT_PREFS, global: { ...DEFAULT_PREFS.global, enabled: false } };
      expect(shouldNotifyForJob("linkedin", 0.9, prefs)).toBe(false);
    });

    it("returns true when global.enabled is true and score meets threshold", () => {
      expect(shouldNotifyForJob("linkedin", 0.8, DEFAULT_PREFS)).toBe(true);
    });
  });

  describe("source-specific settings", () => {
    it("returns false when source is disabled", () => {
      const prefs = {
        ...DEFAULT_PREFS,
        linkedin: { enabled: false, minScoreThreshold: 70, soundEnabled: true },
      };
      expect(shouldNotifyForJob("linkedin", 0.9, prefs)).toBe(false);
    });

    it("returns false when score is below threshold", () => {
      expect(shouldNotifyForJob("linkedin", 0.5, DEFAULT_PREFS)).toBe(false); // 50% < 70%
    });

    it("returns true when score meets threshold", () => {
      expect(shouldNotifyForJob("linkedin", 0.75, DEFAULT_PREFS)).toBe(true); // 75% >= 70%
    });

    it("handles different source thresholds", () => {
      // LinkedIn threshold is 70%, Greenhouse is 80%
      expect(shouldNotifyForJob("linkedin", 0.75, DEFAULT_PREFS)).toBe(true);
      expect(shouldNotifyForJob("greenhouse", 0.75, DEFAULT_PREFS)).toBe(false);
    });

    it("handles unknown sources", () => {
      // Unknown sources have sourceConfig undefined, so they compare raw score >= 70
      // Since score is 0-1, this effectively blocks all unknown sources
      // (This appears to be a bug in the original code but we test actual behavior)
      expect(shouldNotifyForJob("unknown", 0.75, DEFAULT_PREFS)).toBe(false);
      expect(shouldNotifyForJob("unknown", 0.65, DEFAULT_PREFS)).toBe(false);
    });

    it("normalizes source names (lowercase, no spaces)", () => {
      expect(shouldNotifyForJob("LinkedIn", 0.8, DEFAULT_PREFS)).toBe(true);
      expect(shouldNotifyForJob("LINKEDIN", 0.8, DEFAULT_PREFS)).toBe(true);
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
      const job: JobForNotification = { title: "Senior Engineer", company: "TechCorp" };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, job)).toBe(true);

      const juniorJob: JobForNotification = { title: "Engineer", company: "TechCorp" };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, juniorJob)).toBe(false);
    });

    it("filters by exclude keywords", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          excludeKeywords: ["Junior", "Intern"],
        },
      };
      const job: JobForNotification = { title: "Junior Engineer", company: "TechCorp" };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, job)).toBe(false);

      const seniorJob: JobForNotification = { title: "Senior Engineer", company: "TechCorp" };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, seniorJob)).toBe(true);
    });

    it("keyword matching is case-insensitive", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          excludeKeywords: ["INTERN"],
        },
      };
      const job: JobForNotification = { title: "Software Intern", company: "TechCorp" };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, job)).toBe(false);
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
        title: "Engineer",
        company: "Corp",
        salary_max: 80000,
      };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, lowPayJob)).toBe(false);

      // Job with salary meeting minimum
      const goodPayJob: JobForNotification = {
        title: "Engineer",
        company: "Corp",
        salary_max: 120000,
      };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, goodPayJob)).toBe(true);
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
        title: "Engineer",
        company: "Corp",
        salary_min: 80000,
        salary_max: 120000,
      };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, job)).toBe(true);
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
        title: "Engineer",
        company: "Corp",
      };
      // Jobs with 0 or no salary info pass the filter
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, jobNoSalary)).toBe(true);
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
        title: "Engineer",
        company: "Corp",
        remote: true,
      };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, remoteJob)).toBe(true);

      const onsiteJob: JobForNotification = {
        title: "Engineer",
        company: "Corp",
        remote: false,
      };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, onsiteJob)).toBe(false);
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
        title: "Engineer",
        company: "Corp",
        location: "Remote - US",
      };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, job)).toBe(true);
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
        title: "Remote Software Engineer",
        company: "Corp",
      };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, job)).toBe(true);
    });
  });

  describe("advanced filters - company lists", () => {
    it("filters by favorite companies (whitelist)", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          companyWhitelist: ["Google", "Meta"],
        },
      };

      const favoriteJob: JobForNotification = {
        title: "Engineer",
        company: "Google",
      };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, favoriteJob)).toBe(true);

      const otherJob: JobForNotification = {
        title: "Engineer",
        company: "Random Corp",
      };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, otherJob)).toBe(false);
    });

    it("filters by companies to skip (blacklist)", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          companyBlacklist: ["BadCorp", "AvoidMe"],
        },
      };

      const badJob: JobForNotification = {
        title: "Engineer",
        company: "BadCorp",
      };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, badJob)).toBe(false);

      const goodJob: JobForNotification = {
        title: "Engineer",
        company: "GoodCompany",
      };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, goodJob)).toBe(true);
    });

    it("company matching is case-insensitive", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          companyWhitelist: ["google"],
        },
      };

      const job: JobForNotification = {
        title: "Engineer",
        company: "GOOGLE",
      };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, job)).toBe(true);
    });

    it("company matching is partial", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          ...DEFAULT_PREFS.advancedFilters,
          companyWhitelist: ["google"],
        },
      };

      const job: JobForNotification = {
        title: "Engineer",
        company: "Google LLC",
      };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, job)).toBe(true);
    });
  });

  describe("combined filters", () => {
    it("applies all filters together", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        advancedFilters: {
          includeKeywords: ["Senior"],
          excludeKeywords: ["Intern"],
          minSalary: 100,
          remoteOnly: true,
          companyWhitelist: ["Google"],
          companyBlacklist: [],
        },
      };

      // Job that passes all filters
      const perfectJob: JobForNotification = {
        title: "Senior Remote Engineer",
        company: "Google",
        salary_max: 150000,
        remote: true,
      };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, perfectJob)).toBe(true);

      // Job failing include keyword
      const noKeywordJob: JobForNotification = {
        title: "Engineer",
        company: "Google",
        salary_max: 150000,
        remote: true,
      };
      expect(shouldNotifyForJob("linkedin", 0.8, prefs, noKeywordJob)).toBe(false);
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

      expect(screen.getByText("Loading preferences...")).toBeInTheDocument();
    });
  });

  describe("loaded state", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue(DEFAULT_PREFS);
    });

    it("renders title", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Which Jobs Alert You")).toBeInTheDocument();
      });
    });

    it("renders subtitle", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Fine-tune when you get notified about new jobs")).toBeInTheDocument();
      });
    });

    it("renders All Notifications toggle", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("All Notifications")).toBeInTheDocument();
      });
    });

    it("renders Quiet Hours section", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Quiet Hours")).toBeInTheDocument();
      });
    });

    it("renders per-source settings", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Per-Source Settings")).toBeInTheDocument();
        expect(screen.getByText("LinkedIn")).toBeInTheDocument();
        expect(screen.getByText("Greenhouse")).toBeInTheDocument();
        expect(screen.getByText("Lever")).toBeInTheDocument();
        expect(screen.getByText("JobsWithGPT")).toBeInTheDocument();
      });
    });

    it("renders Extra Filters section", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Extra Filters")).toBeInTheDocument();
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
        const perSourceSection = screen.getByText("Per-Source Settings").parentElement;
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
        expect(screen.getByText("Only notify if title contains")).toBeInTheDocument();
      });
    });

    it("renders exclude keywords input", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Never notify if title contains")).toBeInTheDocument();
      });
    });

    it("renders minimum salary input", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Minimum Salary")).toBeInTheDocument();
        expect(screen.getByText("K/year")).toBeInTheDocument();
      });
    });

    it("renders remote only toggle", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Remote Only")).toBeInTheDocument();
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
        expect(screen.getByText("Favorite Companies")).toBeInTheDocument();
      });
    });

    it("renders companies to skip section", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("Companies to Skip")).toBeInTheDocument();
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
        expect(screen.getByText("All Notifications")).toBeInTheDocument();
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
    it("shows error toast when save fails", async () => {
      mockInvoke
        .mockResolvedValueOnce(DEFAULT_PREFS) // initial load
        .mockRejectedValueOnce(new Error("Save failed")); // save fails

      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(screen.getByText("All Notifications")).toBeInTheDocument();
      });

      // Toggle to trigger save
      const toggles = screen.getAllByRole("checkbox");
      fireEvent.click(toggles[0]);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Failed to save",
          "Your changes have been reverted"
        );
      });
    });
  });
});
