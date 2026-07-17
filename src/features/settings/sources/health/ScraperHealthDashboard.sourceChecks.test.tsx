import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScraperHealthDashboard } from "./ScraperHealthDashboard";
import {
  mockScrapers,
  mockSummary,
  mockTestResults,
} from "./ScraperHealthDashboard.testData";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("../../../../shared/errorReporting/logger", () => ({
  logError: vi.fn(),
}));

describe("ScraperHealthDashboard source checks", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function confirmAndRunAllSourceChecks(
    user: ReturnType<typeof userEvent.setup>,
  ) {
    await user.click(screen.getByText("Check Sources Now"));
    const reviewDialog = await screen.findByRole("dialog", {
      name: /review source check/i,
    });
    await user.click(
      within(reviewDialog).getByRole("button", { name: /continue checking/i }),
    );
  }

  describe("source check all", () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "run_all_smoke_tests") return Promise.resolve(mockTestResults);
        return Promise.resolve(null);
      });
    });

    it("runs all source checks when button clicked", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Check Sources Now")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Check Sources Now"));

      const reviewDialog = await screen.findByRole("dialog", {
        name: /review source check/i,
      });
      expect(reviewDialog).toHaveTextContent(/some job boards have rules/i);
      expect(mockInvoke).not.toHaveBeenCalledWith(
        "run_all_smoke_tests",
        expect.anything(),
      );
      await user.click(
        within(reviewDialog).getByRole("button", { name: /continue checking/i }),
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("run_all_smoke_tests", {
          restrictedSourceAcknowledged: true,
        });
      });
    });

    it("shows testing state while running", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "run_all_smoke_tests") {
          return new Promise((resolve) => setTimeout(() => resolve(mockTestResults), 1000));
        }
        return Promise.resolve(null);
      });

      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Check Sources Now")).toBeInTheDocument();
      });

      await confirmAndRunAllSourceChecks(user);

      await waitFor(() => {
        expect(screen.getByText("Checking...")).toBeInTheDocument();
      });
    });

    it("shows test results modal after completion", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Check Sources Now")).toBeInTheDocument();
      });

      await confirmAndRunAllSourceChecks(user);

      await waitFor(() => {
        expect(screen.getByText("Check Results")).toBeInTheDocument();
      });
    });

    it("displays safe status badges in results", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Check Sources Now")).toBeInTheDocument();
      });

      await confirmAndRunAllSourceChecks(user);

      await waitFor(() => {
        expect(screen.getByText("Worked")).toBeInTheDocument();
        expect(screen.getByText("Problem found")).toBeInTheDocument();
      });
    });

    it("shows skipped checks as neutral instead of worked", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "run_all_smoke_tests") {
          return Promise.resolve([
            {
              scraper_name: "usajobs",
              test_type: "connectivity",
              passed: true,
              duration_ms: 25,
              details: {
                status: "skipped",
                reason: "USAJobs API key not saved",
              },
              error: null,
            },
          ]);
        }
        return Promise.resolve(null);
      });

      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Check Sources Now")).toBeInTheDocument();
      });

      await confirmAndRunAllSourceChecks(user);

      await waitFor(() => {
        expect(screen.getByText("Skipped")).toBeInTheDocument();
      });
      expect(screen.queryByText("Worked")).not.toBeInTheDocument();
    });

    it("displays plain check speeds in results", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Check Sources Now")).toBeInTheDocument();
      });

      await confirmAndRunAllSourceChecks(user);

      await waitFor(() => {
        const resultsDialog = screen.getByRole("dialog", {
          name: /check results/i,
        });
        expect(within(resultsDialog).getByText("1.2s")).toBeInTheDocument();
        expect(within(resultsDialog).getByText("5.0s")).toBeInTheDocument();
      });
    });

    it("displays safe issue guidance for failed checks", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Check Sources Now")).toBeInTheDocument();
      });

      await confirmAndRunAllSourceChecks(user);

      await waitFor(() => {
        expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
      });
      expect(screen.queryByText("Connection refused")).not.toBeInTheDocument();
    });

    it("closes results modal when close clicked", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Check Sources Now")).toBeInTheDocument();
      });

      await confirmAndRunAllSourceChecks(user);

      await waitFor(() => {
        expect(screen.getByText("Check Results")).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByText("Close");
      await user.click(closeButtons[closeButtons.length - 1]);

      await waitFor(() => {
        expect(screen.queryByText("Check Results")).not.toBeInTheDocument();
      });
    });
  });

  describe("refresh functionality", () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        return Promise.resolve(null);
      });
    });

    it("reloads data when refresh clicked", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Refresh")).toBeInTheDocument();
      });

      mockInvoke.mockClear();
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        return Promise.resolve(null);
      });

      await user.click(screen.getByText("Refresh"));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("get_health_summary", {});
        expect(mockInvoke).toHaveBeenCalledWith("get_scraper_health", {});
      });
    });
  });

  describe("formatting utilities", () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") {
          return Promise.resolve([
            {
              ...mockScrapers[0],
              avg_duration_ms: 500,
            },
          ]);
        }
        return Promise.resolve(null);
      });
    });

    it("formats short checks without millisecond jargon", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("under 1s")).toBeInTheDocument();
      });
    });

    it("shows plain copy for sources not checked yet", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve([mockScrapers[2]]);
        return Promise.resolve(null);
      });

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Not checked yet")).toBeInTheDocument();
      });
    });
  });
});
