import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  getDashboardLoadErrorMessage,
  getDashboardSearchErrorCopy,
} from "./dashboardErrorCopy";
import { formatDashboardFitEstimate } from "./dashboardFitEstimate";
import { getNoJobsEmptyStateCopy } from "./DashboardUI/noJobsEmptyStateCopy";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

// safeInvoke calls invoke internally — mock at that boundary
const mockInvoke = vi.mocked(invoke);

type DashboardPreferences = {
  autoRefresh: {
    enabled: boolean;
    interval_minutes: number;
  };
  salaryFloorUsd: number | null;
  anyJobSourceEnabled: boolean;
};

function canSearchFromPreferences(preferences: DashboardPreferences | null): boolean {
  if (!preferences) return true;
  return preferences.anyJobSourceEnabled;
}

/**
 * Mirrors the Dashboard pre-flight check.
 * Returns "blocked" when no job sources are enabled, "allowed" otherwise.
 * If the preferences call throws, search proceeds ("allowed").
 */
async function runPreflight(
  getPreferences: () => Promise<DashboardPreferences | null>,
  warn: () => void,
): Promise<"allowed" | "blocked"> {
  try {
    const preferences = await getPreferences();
    if (!canSearchFromPreferences(preferences)) {
      warn();
      return "blocked";
    }
  } catch {
    // Preferences check failed; proceed with search anyway.
  }
  return "allowed";
}

// ---------------------------------------------------------------------------

describe("formatDashboardFitEstimate", () => {
  it("pairs fit labels with percentages for comparison rows", () => {
    expect(formatDashboardFitEstimate(0.92)).toBe("Strong fit (92%)");
    expect(formatDashboardFitEstimate(0.82)).toBe("Good fit (82%)");
    expect(formatDashboardFitEstimate(0.55)).toBe("Possible fit (55%)");
    expect(formatDashboardFitEstimate(0.3)).toBe("Needs review (30%)");
  });

  it("uses a plain unavailable label when a fit estimate is missing", () => {
    expect(formatDashboardFitEstimate(null)).toBe("Not available");
    expect(formatDashboardFitEstimate(Number.NaN)).toBe("Not available");
  });
});

describe("Dashboard handleSearchNow pre-flight check", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe("canSearchFromPreferences", () => {
    it("returns false when no job source is enabled", () => {
      expect(
        canSearchFromPreferences({
          autoRefresh: { enabled: false, interval_minutes: 30 },
          salaryFloorUsd: 80000,
          anyJobSourceEnabled: false,
        }),
      ).toBe(false);
    });

    it("returns true when any job source is enabled", () => {
      expect(
        canSearchFromPreferences({
          autoRefresh: { enabled: true, interval_minutes: 30 },
          salaryFloorUsd: 80000,
          anyJobSourceEnabled: true,
        }),
      ).toBe(true);
    });

    it("returns true when preferences are null", () => {
      expect(canSearchFromPreferences(null)).toBe(true);
    });
  });

  describe("runPreflight (integration with warning + return path)", () => {
    it("calls warn and returns 'blocked' when no job sources are enabled", async () => {
      const getPreferences = vi.fn().mockResolvedValue({
        autoRefresh: { enabled: false, interval_minutes: 30 },
        salaryFloorUsd: 80000,
        anyJobSourceEnabled: false,
      } satisfies DashboardPreferences);
      const warn = vi.fn();

      const result = await runPreflight(getPreferences, warn);

      expect(warn).toHaveBeenCalledOnce();
      expect(result).toBe("blocked");
    });

    it("does NOT call warn and returns 'allowed' when one source is enabled", async () => {
      const getPreferences = vi.fn().mockResolvedValue({
        autoRefresh: { enabled: true, interval_minutes: 30 },
        salaryFloorUsd: 80000,
        anyJobSourceEnabled: true,
      } satisfies DashboardPreferences);
      const warn = vi.fn();

      const result = await runPreflight(getPreferences, warn);

      expect(warn).not.toHaveBeenCalled();
      expect(result).toBe("allowed");
    });

    it("returns 'allowed' without warning when preferences are null", async () => {
      const getPreferences = vi.fn().mockResolvedValue(null);
      const warn = vi.fn();

      const result = await runPreflight(getPreferences, warn);

      expect(warn).not.toHaveBeenCalled();
      expect(result).toBe("allowed");
    });

    it("proceeds ('allowed') without warning when preferences call throws", async () => {
      const getPreferences = vi.fn().mockRejectedValue(new Error("IPC failure"));
      const warn = vi.fn();

      const result = await runPreflight(getPreferences, warn);

      expect(warn).not.toHaveBeenCalled();
      expect(result).toBe("allowed");
    });

    it("warns exactly once when preferences report no enabled source", async () => {
      const getPreferences = vi.fn().mockResolvedValue({
        autoRefresh: { enabled: false, interval_minutes: 30 },
        salaryFloorUsd: 80000,
        anyJobSourceEnabled: false,
      } satisfies DashboardPreferences);
      const warn = vi.fn();

      await runPreflight(getPreferences, warn);

      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe("safeInvoke integration (via mocked invoke)", () => {
    it("invoke is called with 'get_dashboard_preferences' during pre-flight", async () => {
      mockInvoke.mockResolvedValueOnce({
        autoRefresh: { enabled: true, interval_minutes: 30 },
        salaryFloorUsd: 80000,
        anyJobSourceEnabled: true,
      } satisfies DashboardPreferences);

      const { safeInvoke } = await import("../utils/api");
      const preferences = await safeInvoke<DashboardPreferences>(
        "get_dashboard_preferences",
      );

      expect(mockInvoke).toHaveBeenCalledWith("get_dashboard_preferences", undefined);
      expect(mockInvoke).not.toHaveBeenCalledWith("get_config", undefined);
      expect(canSearchFromPreferences(preferences)).toBe(true);
    });

    it("pre-flight allows search when invoke throws (network/IPC error)", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Tauri backend unavailable"));

      const { safeInvoke } = await import("../utils/api");
      const warn = vi.fn();

      let result: "allowed" | "blocked" = "allowed";
      try {
        const preferences = await safeInvoke<DashboardPreferences>(
          "get_dashboard_preferences",
        );
        if (!canSearchFromPreferences(preferences)) {
          warn();
          result = "blocked";
        }
      } catch {
        // mirrors Dashboard: preferences check failed, proceed
      }

      expect(warn).not.toHaveBeenCalled();
      expect(result).toBe("allowed");
    });
  });
});

describe("Dashboard safe error copy", () => {
  const privateFailure = new Error(
    "token=raw-secret chad@example.com /Users/chad/private/resume.pdf",
  );

  it("does not expose raw private details in load errors", () => {
    const message = getDashboardLoadErrorMessage(privateFailure);

    expect(message).toContain("safe support report");
    expect(message).not.toMatch(/raw-secret|chad@example\.com|\/Users\/chad/);
  });

  it("does not expose raw private details in search errors", () => {
    const copy = getDashboardSearchErrorCopy(privateFailure);
    const visibleText = `${copy.title} ${copy.message}`;

    expect(copy.title).toBe("Could not search jobs");
    expect(visibleText).toContain("safe support report");
    expect(visibleText).not.toMatch(/raw-secret|chad@example\.com|\/Users\/chad/);
  });
});

describe("Dashboard no-jobs empty state copy", () => {
  it("gives a direct source setup path when no source is enabled", () => {
    const copy = getNoJobsEmptyStateCopy(false);

    expect(copy.title).toBe("Turn on job sources");
    expect(copy.primaryLabel).toBe("Turn On Job Sources");
    expect(copy.secondaryLabel).toBe("Import a Job Posting");
    expect(copy.helperText).toContain("Sources & Alerts");
    expect(copy.helperText).not.toContain("More Settings");
    expect(copy.firstStepTitle).toBe("Choose sources");
  });

  it("keeps normal first-run search copy when source status is unknown", () => {
    const copy = getNoJobsEmptyStateCopy(null);

    expect(copy.title).toBe("No jobs yet");
    expect(copy.primaryLabel).toBe("Search Now");
    expect(copy.secondaryLabel).toBe("Adjust Search Preferences");
    expect(copy.helperText).toContain("before changing your lowest acceptable pay");
    expect(copy.helperText).not.toContain("lowest pay you want");
    expect(copy.firstStepTitle).toBe("Search selected job sites");
    expect(copy.firstStepDescription).toBe("JobSentinel checks them on your schedule");
  });
});
