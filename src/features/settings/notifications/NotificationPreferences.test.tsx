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
          screen.getByText(
            "Use alerts for jobs worth checking. Quiet hours protect your time.",
          ),
        ).toBeInTheDocument();
      });
    });

    it("uses plain alert-filter copy instead of score-threshold wording", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(
          screen.getAllByText("How picky alerts are:").length,
        ).toBeGreaterThan(0);
      });

      expect(screen.queryByText("Match strength:")).not.toBeInTheDocument();
      expect(screen.queryByText("Alert selectivity:")).not.toBeInTheDocument();
      expect(screen.queryByText("Quality:")).not.toBeInTheDocument();
      expect(screen.queryByText(/score threshold/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/above this match score/i),
      ).not.toBeInTheDocument();
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
        expect(
          screen.getByText("Turn every job alert on or off"),
        ).toBeInTheDocument();
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
        expect(
          screen.getByText(/Other job boards that are turned on/),
        ).toBeInTheDocument();
        expect(
          screen.queryByText(/enabled job boards/i),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText("Source Alert Rules"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText("Which Jobs Alert You"),
        ).not.toBeInTheDocument();
        expect(screen.queryByText(/interrupt you/i)).not.toBeInTheDocument();
        expect(
          screen.queryByText(/Detailed rules currently apply/i),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("LinkedIn")).not.toBeInTheDocument();
        expect(screen.getByText("Indeed")).toBeInTheDocument();
        expect(screen.getByText("Greenhouse")).toBeInTheDocument();
        expect(screen.getByText("Lever")).toBeInTheDocument();
        expect(screen.getByText("Connected job source")).toBeInTheDocument();
        expect(screen.queryByText("JobsWithGPT")).not.toBeInTheDocument();
        expect(
          screen.getByRole("checkbox", {
            name: "Turn Indeed alerts on or off",
          }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("checkbox", {
            name: "Turn Indeed alert sound on or off",
          }),
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
        const perSourceSection =
          screen.getByText("Alert sources").parentElement;
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
        expect(
          screen.getByText("Alert only when the job title has"),
        ).toBeInTheDocument();
        expect(
          screen.queryByText("Only notify if title contains"),
        ).not.toBeInTheDocument();
      });
    });

    it("renders exclude keywords input", async () => {
      render(<NotificationPreferencesComponent />);

      await waitFor(() => {
        expect(
          screen.getByText("Do not alert when the job title has"),
        ).toBeInTheDocument();
        expect(
          screen.queryByText("Never notify if title contains"),
        ).not.toBeInTheDocument();
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
        expect(
          screen.getByText("Companies you want alerts from"),
        ).toBeInTheDocument();
        expect(
          screen.queryByText("Favorite Companies"),
        ).not.toBeInTheDocument();
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

});
