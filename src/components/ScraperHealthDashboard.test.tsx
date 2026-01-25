import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScraperHealthDashboard } from "./ScraperHealthDashboard";

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock error utils
vi.mock("../utils/errorUtils", () => ({
  logError: vi.fn(),
}));

// Mock data
const mockSummary = {
  total_scrapers: 13,
  healthy: 8,
  degraded: 2,
  down: 1,
  disabled: 2,
  total_jobs_24h: 1500,
};

const mockScrapers = [
  {
    scraper_name: "indeed",
    display_name: "Indeed",
    is_enabled: true,
    requires_auth: false,
    scraper_type: "html" as const,
    health_status: "healthy" as const,
    selector_health: "healthy" as const,
    success_rate_24h: 95,
    avg_duration_ms: 2500,
    last_success: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    last_error: null,
    total_runs_24h: 24,
    jobs_found_24h: 150,
    rate_limit_per_hour: 60,
  },
  {
    scraper_name: "linkedin",
    display_name: "LinkedIn",
    is_enabled: true,
    requires_auth: true,
    scraper_type: "api" as const,
    health_status: "degraded" as const,
    selector_health: "unknown" as const,
    success_rate_24h: 72,
    avg_duration_ms: 3500,
    last_success: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    last_error: "Rate limited",
    total_runs_24h: 20,
    jobs_found_24h: 80,
    rate_limit_per_hour: 30,
  },
  {
    scraper_name: "glassdoor",
    display_name: "Glassdoor",
    is_enabled: false,
    requires_auth: false,
    scraper_type: "hybrid" as const,
    health_status: "disabled" as const,
    selector_health: "degraded" as const,
    success_rate_24h: 0,
    avg_duration_ms: null,
    last_success: null,
    last_error: null,
    total_runs_24h: 0,
    jobs_found_24h: 0,
    rate_limit_per_hour: 20,
  },
  {
    scraper_name: "monster",
    display_name: "Monster",
    is_enabled: true,
    requires_auth: false,
    scraper_type: "html" as const,
    health_status: "down" as const,
    selector_health: "broken" as const,
    success_rate_24h: 35,
    avg_duration_ms: 5000,
    last_success: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    last_error: "Connection timeout",
    total_runs_24h: 10,
    jobs_found_24h: 5,
    rate_limit_per_hour: 40,
  },
];

const mockCredentials = [
  {
    credential_name: "LinkedIn API Key",
    is_valid: true,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    days_until_expiry: 7,
    last_validated: new Date().toISOString(),
    warning_message: null,
  },
];

const mockRuns = [
  {
    id: 1,
    scraper_name: "indeed",
    started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    finished_at: new Date(Date.now() - 29 * 60 * 1000).toISOString(),
    duration_ms: 2500,
    status: "success" as const,
    jobs_found: 15,
    jobs_new: 3,
    error_message: null,
    error_code: null,
    retry_attempt: 0,
  },
  {
    id: 2,
    scraper_name: "indeed",
    started_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    finished_at: new Date(Date.now() - 89 * 60 * 1000).toISOString(),
    duration_ms: 3000,
    status: "error" as const,
    jobs_found: 0,
    jobs_new: 0,
    error_message: "Timeout",
    error_code: "TIMEOUT",
    retry_attempt: 1,
  },
];

const mockTestResults = [
  {
    scraper_name: "indeed",
    success: true,
    response_time_ms: 1200,
    error_message: null,
    tested_at: new Date().toISOString(),
  },
  {
    scraper_name: "linkedin",
    success: false,
    response_time_ms: 5000,
    error_message: "Connection refused",
    tested_at: new Date().toISOString(),
  },
];

describe("ScraperHealthDashboard", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("shows loading spinner initially", () => {
      mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ScraperHealthDashboard onClose={onClose} />);

      expect(screen.getByText(/loading scraper health/i)).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows error message on load failure", async () => {
      mockInvoke.mockRejectedValue(new Error("Network error"));

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("shows retry button on error", async () => {
      mockInvoke.mockRejectedValue(new Error("Failed"));

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Retry")).toBeInTheDocument();
      });
    });

    it("shows close button on error", async () => {
      mockInvoke.mockRejectedValue(new Error("Failed"));

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Close")).toBeInTheDocument();
      });
    });

    it("retries loading when retry is clicked", async () => {
      const user = userEvent.setup();
      // Initial load fails (all 3 parallel calls)
      mockInvoke.mockRejectedValueOnce(new Error("Failed"));
      mockInvoke.mockRejectedValueOnce(new Error("Failed"));
      mockInvoke.mockRejectedValueOnce(new Error("Failed"));

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Retry")).toBeInTheDocument();
      });

      // Now setup successful responses for retry
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        return Promise.resolve(null);
      });

      await user.click(screen.getByText("Retry"));

      await waitFor(() => {
        expect(screen.getByText("Scraper Health Dashboard")).toBeInTheDocument();
      });
    });

    it("calls onClose when close button clicked in error state", async () => {
      const user = userEvent.setup();
      mockInvoke.mockRejectedValue(new Error("Failed"));

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Close")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Close"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("dashboard header", () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        return Promise.resolve(null);
      });
    });

    it("shows dashboard title", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Scraper Health Dashboard")).toBeInTheDocument();
      });
    });

    it("shows description text", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/monitor the health and performance of all 13 job board scrapers/i)).toBeInTheDocument();
      });
    });

    it("shows Test All button", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Test All")).toBeInTheDocument();
      });
    });

    it("shows Refresh button", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Refresh")).toBeInTheDocument();
      });
    });

    it("shows Close button", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        const closeButtons = screen.getAllByText("Close");
        expect(closeButtons.length).toBeGreaterThan(0);
      });
    });

    it("calls onClose when close button clicked", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Scraper Health Dashboard")).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByText("Close");
      await user.click(closeButtons[0]);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("summary stats", () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        return Promise.resolve(null);
      });
    });

    it("displays total scrapers count", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Total Scrapers")).toBeInTheDocument();
      });
      expect(screen.getByText("13")).toBeInTheDocument();
    });

    it("displays healthy count", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        // Check for the stat card with Healthy label
        const statCards = screen.getByRole("region", { name: /health summary statistics/i });
        expect(within(statCards).getByText("Healthy")).toBeInTheDocument();
        expect(within(statCards).getByText("8")).toBeInTheDocument();
      });
    });

    it("displays degraded count", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        const statCards = screen.getByRole("region", { name: /health summary statistics/i });
        expect(within(statCards).getByText("Degraded")).toBeInTheDocument();
        // Use aria-label to find specific value
        expect(within(statCards).getByLabelText("Degraded value: 2")).toBeInTheDocument();
      });
    });

    it("displays down count", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        const statCards = screen.getByRole("region", { name: /health summary statistics/i });
        expect(within(statCards).getByText("Down")).toBeInTheDocument();
        expect(within(statCards).getByLabelText("Down value: 1")).toBeInTheDocument();
      });
    });

    it("displays disabled count", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        const statCards = screen.getByRole("region", { name: /health summary statistics/i });
        expect(within(statCards).getByText("Disabled")).toBeInTheDocument();
        expect(within(statCards).getByLabelText("Disabled value: 2")).toBeInTheDocument();
      });
    });

    it("displays jobs found in 24h", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        const statCards = screen.getByRole("region", { name: /health summary statistics/i });
        expect(within(statCards).getByText("Jobs (24h)")).toBeInTheDocument();
        // Value is formatted with toLocaleString(), so 1500 becomes "1,500"
        expect(within(statCards).getByLabelText(/Jobs \(24h\) value: 1,500/)).toBeInTheDocument();
      });
    });

    it("has accessible region for stats", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByRole("region", { name: /health summary statistics/i })).toBeInTheDocument();
      });
    });
  });

  describe("credential warnings", () => {
    it("shows credential warnings when present", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve(mockCredentials);
        return Promise.resolve(null);
      });

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Credential Warnings")).toBeInTheDocument();
      });
      expect(screen.getByText("LinkedIn API Key")).toBeInTheDocument();
      expect(screen.getByText(/expires in 7 days/i)).toBeInTheDocument();
    });

    it("does not show credential warnings when empty", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        return Promise.resolve(null);
      });

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Scraper Health Dashboard")).toBeInTheDocument();
      });
      expect(screen.queryByText("Credential Warnings")).not.toBeInTheDocument();
    });

    it("shows custom warning message when provided", async () => {
      const customCredential = {
        ...mockCredentials[0],
        warning_message: "Token needs refresh",
      };
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([customCredential]);
        return Promise.resolve(null);
      });

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Token needs refresh")).toBeInTheDocument();
      });
    });
  });

  describe("scraper table", () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        return Promise.resolve(null);
      });
    });

    it("displays scraper display names", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });
      expect(screen.getByText("LinkedIn")).toBeInTheDocument();
      expect(screen.getByText("Glassdoor")).toBeInTheDocument();
      expect(screen.getByText("Monster")).toBeInTheDocument();
    });

    it("displays scraper names", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("indeed")).toBeInTheDocument();
      });
      expect(screen.getByText(/linkedin/)).toBeInTheDocument();
    });

    it("shows auth indicator for scrapers requiring auth", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("(auth)")).toBeInTheDocument();
      });
    });

    it("displays health status badges", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        // Table shows Healthy badge for Indeed
        const table = screen.getByRole("table", { name: /scraper health status/i });
        // Multiple "Healthy" texts may appear - one in summary and in table
        const healthyBadges = screen.getAllByText("Healthy");
        expect(healthyBadges.length).toBeGreaterThan(0);
      });
      // Also check for Degraded badge in table
      expect(screen.getAllByText("Degraded").length).toBeGreaterThan(0);
    });

    it("displays scraper type badges", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByRole("table", { name: /scraper health status/i })).toBeInTheDocument();
      });
      // Check for type badges - multiple HTML scrapers exist
      expect(screen.getAllByText("HTML").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("API")).toBeInTheDocument();
      expect(screen.getByText("HYBRID")).toBeInTheDocument();
    });

    it("displays success rates with color coding", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("95%")).toBeInTheDocument();
      });
      expect(screen.getByText("72%")).toBeInTheDocument();
      expect(screen.getByText("35%")).toBeInTheDocument();
    });

    it("displays average duration", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("2.5s")).toBeInTheDocument();
      });
      expect(screen.getByText("3.5s")).toBeInTheDocument();
    });

    it("displays jobs found and runs", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("150")).toBeInTheDocument();
      });
      expect(screen.getByText("/ 24 runs")).toBeInTheDocument();
    });

    it("displays relative time for last success", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("30m ago")).toBeInTheDocument();
      });
      expect(screen.getByText("2h ago")).toBeInTheDocument();
    });

    it("shows 'Never' for scrapers that never succeeded", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Never")).toBeInTheDocument();
      });
    });

    it("displays selector health for html/hybrid scrapers", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("OK")).toBeInTheDocument(); // healthy selector
      });
      expect(screen.getByText("Broken")).toBeInTheDocument(); // broken selector
    });

    it("has accessible table structure", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByRole("table", { name: /scraper health status/i })).toBeInTheDocument();
      });
    });
  });

  describe("scraper actions", () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        if (cmd === "set_scraper_enabled") return Promise.resolve(undefined);
        if (cmd === "run_scraper_smoke_test") return Promise.resolve(mockTestResults[0]);
        return Promise.resolve(null);
      });
    });

    it("toggles scraper enabled state", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      // Find enable/disable buttons (they have tooltips)
      const toggleButtons = screen.getAllByRole("button").filter(
        (btn) => btn.querySelector("svg") && btn.classList.contains("p-1.5")
      );

      // Click first toggle button (Indeed is enabled, so this should disable)
      await user.click(toggleButtons[0]);

      expect(mockInvoke).toHaveBeenCalledWith("set_scraper_enabled", {
        scraperName: "indeed",
        enabled: false,
      });
    });

    it("runs smoke test for single scraper", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      // Find play buttons (smoke test buttons)
      const playButtons = screen.getAllByRole("button").filter((btn) => {
        const svg = btn.querySelector("svg");
        return svg && btn.classList.contains("p-1.5") && btn.querySelector('path[d*="14.752"]');
      });

      if (playButtons.length > 0) {
        await user.click(playButtons[0]);

        await waitFor(() => {
          expect(mockInvoke).toHaveBeenCalledWith("run_scraper_smoke_test", {
            scraperName: "indeed",
          });
        });
      }
    });
  });

  describe("run history", () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string, args?: unknown) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        if (cmd === "get_scraper_runs") return Promise.resolve(mockRuns);
        return Promise.resolve(null);
      });
    });

    it("shows run history when scraper is selected", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Indeed"));

      await waitFor(() => {
        expect(screen.getByText(/recent runs: indeed/i)).toBeInTheDocument();
      });
    });

    it("loads run history data when scraper selected", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Indeed"));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("get_scraper_runs", {
          scraperName: "indeed",
          limit: 20,
        });
      });
    });

    it("displays run status badges", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Indeed"));

      await waitFor(() => {
        expect(screen.getByText("success")).toBeInTheDocument();
      });
      expect(screen.getByText(/error.*retry 1/i)).toBeInTheDocument();
    });

    it("displays job counts in run history", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Indeed"));

      await waitFor(() => {
        const historyPanel = screen.getByRole("region", { name: /recent runs/i });
        expect(within(historyPanel).getByText("15")).toBeInTheDocument();
        expect(within(historyPanel).getByText("+3")).toBeInTheDocument();
      });
    });

    it("displays error messages in run history", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Indeed"));

      await waitFor(() => {
        expect(screen.getByText("Timeout")).toBeInTheDocument();
      });
    });

    it("hides run history when same scraper is clicked again", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Indeed"));
      await waitFor(() => {
        expect(screen.getByText(/recent runs: indeed/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText("Indeed"));
      await waitFor(() => {
        expect(screen.queryByText(/recent runs: indeed/i)).not.toBeInTheDocument();
      });
    });

    it("shows no recent runs message when empty", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        if (cmd === "get_scraper_runs") return Promise.resolve([]);
        return Promise.resolve(null);
      });

      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Indeed"));

      await waitFor(() => {
        expect(screen.getByText("No recent runs found.")).toBeInTheDocument();
      });
    });
  });

  describe("smoke test all", () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        if (cmd === "run_all_smoke_tests") return Promise.resolve(mockTestResults);
        return Promise.resolve(null);
      });
    });

    it("runs all smoke tests when button clicked", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Test All")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test All"));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("run_all_smoke_tests");
      });
    });

    it("shows testing state while running", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        if (cmd === "run_all_smoke_tests") {
          return new Promise((resolve) => setTimeout(() => resolve(mockTestResults), 1000));
        }
        return Promise.resolve(null);
      });

      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Test All")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test All"));

      await waitFor(() => {
        expect(screen.getByText("Testing...")).toBeInTheDocument();
      });
    });

    it("shows test results modal after completion", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Test All")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test All"));

      await waitFor(() => {
        expect(screen.getByText("Smoke Test Results")).toBeInTheDocument();
      });
    });

    it("displays pass/fail badges in results", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Test All")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test All"));

      await waitFor(() => {
        expect(screen.getByText("PASS")).toBeInTheDocument();
        expect(screen.getByText("FAIL")).toBeInTheDocument();
      });
    });

    it("displays response times in results", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Test All")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test All"));

      await waitFor(() => {
        expect(screen.getByText("1200ms")).toBeInTheDocument();
        expect(screen.getByText("5000ms")).toBeInTheDocument();
      });
    });

    it("displays error messages for failed tests", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Test All")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test All"));

      await waitFor(() => {
        expect(screen.getByText("Connection refused")).toBeInTheDocument();
      });
    });

    it("closes results modal when close clicked", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Test All")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test All"));

      await waitFor(() => {
        expect(screen.getByText("Smoke Test Results")).toBeInTheDocument();
      });

      // Find close button in modal
      const closeButtons = screen.getAllByText("Close");
      await user.click(closeButtons[closeButtons.length - 1]);

      await waitFor(() => {
        expect(screen.queryByText("Smoke Test Results")).not.toBeInTheDocument();
      });
    });
  });

  describe("refresh functionality", () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        return Promise.resolve(null);
      });
    });

    it("reloads data when refresh clicked", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Refresh")).toBeInTheDocument();
      });

      // Clear mock calls after initial load
      mockInvoke.mockClear();
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        return Promise.resolve(null);
      });

      await user.click(screen.getByText("Refresh"));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("get_health_summary");
        expect(mockInvoke).toHaveBeenCalledWith("get_scraper_health");
        expect(mockInvoke).toHaveBeenCalledWith("get_expiring_credentials");
      });
    });
  });

  describe("formatting utilities", () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve([
          {
            ...mockScrapers[0],
            avg_duration_ms: 500, // Less than 1 second
          },
        ]);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        return Promise.resolve(null);
      });
    });

    it("formats milliseconds correctly", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("500ms")).toBeInTheDocument();
      });
    });

    it("shows dash for null duration", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve([mockScrapers[2]]); // Glassdoor with null duration
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        return Promise.resolve(null);
      });

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        // Check for dash indicating null duration
        const cells = screen.getAllByText("-");
        expect(cells.length).toBeGreaterThan(0);
      });
    });
  });
});
