import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationPreferences as NotificationPreferencesComponent } from "./NotificationPreferences";
import type { NotificationPreferences } from "./notificationPreferencesStore";
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
vi.mock("../../../shared/toast/useToast", () => ({
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
    includedCompanies: [],
    excludedCompanies: [],
  },
};


describe("NotificationPreferences error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });
  describe("error handling", () => {
    it("does not show default alert rules when loading saved rules fails", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Load failed"));

      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Could not load alert rules. Your saved choices were not changed.",
          ),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText("Try again before changing alert rules."),
      ).toBeInTheDocument();
      expect(screen.queryByText("All job alerts")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /try again/i }),
      ).toBeInTheDocument();
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
          "Your last change was undone. Try again, or copy a safe support report if this keeps happening.",
        );
      });
    });
  });
});
