import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
    scraper_name: "usajobs",
    display_name: "USAJobs",
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
    key: "smtp_password",
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    last_validated: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "expiring" as const,
    days_until_expiry: 7,
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
    test_type: "connectivity" as const,
    passed: true,
    duration_ms: 1200,
    details: null,
    error: null,
  },
  {
    scraper_name: "usajobs",
    test_type: "connectivity" as const,
    passed: false,
    duration_ms: 5000,
    details: null,
    error: "Connection refused",
  },
];

describe("ScraperHealthDashboard", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // Ensure real timers are used
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("loading state", () => {
    it("shows loading spinner initially", async () => {
      vi.useFakeTimers();
      mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ScraperHealthDashboard onClose={onClose} />);

      // Advance past the spinner delay (250ms) and flush React updates
      await vi.advanceTimersByTimeAsync(300);
      await vi.advanceTimersByTimeAsync(0); // Flush any pending React updates

      // Check for the loading role status element with the loading message
      expect(screen.getByRole("status", { name: /loading job sources/i })).toBeInTheDocument();
      vi.useRealTimers();
    });
  });

  describe("error state", () => {
    it("shows safe error guidance on load failure", async () => {
      mockInvoke.mockRejectedValue(new Error("Network error"));

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/copy a safe support report/i)).toBeInTheDocument();
      });
    });

    it("does not show raw private details on load failure", async () => {
      mockInvoke.mockRejectedValue(
        new Error("token=raw-secret chad@example.com /Users/chad/private/resume.pdf")
      );

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/safe support report/i)).toBeInTheDocument();
      });
      expect(screen.queryByText(/raw-secret|chad@example\.com|\/Users\/chad/)).not.toBeInTheDocument();
    });

    it("shows plain recovery actions on error", async () => {
      mockInvoke.mockRejectedValue(new Error("Failed"));

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Could not check job sources")).toBeInTheDocument();
        expect(screen.getByText("Try Again")).toBeInTheDocument();
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
        expect(screen.getByText("Try Again")).toBeInTheDocument();
      });

      // Now setup successful responses for retry
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        return Promise.resolve(null);
      });

      await user.click(screen.getByText("Try Again"));

      await waitFor(() => {
        expect(screen.getByText("Job Sources")).toBeInTheDocument();
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
        expect(screen.getByText("Job Sources")).toBeInTheDocument();
      });
    });

    it("shows description text", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/check whether job sources are available/i)).toBeInTheDocument();
      });
    });

    it("shows Check Sources Now button", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Check Sources Now")).toBeInTheDocument();
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
        expect(screen.getByText("Job Sources")).toBeInTheDocument();
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

    it("displays total sources count", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Sources")).toBeInTheDocument();
      });
      expect(screen.getByText("13")).toBeInTheDocument();
    });

    it("displays healthy count", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        // Check for the stat card with Working label
        const statCards = screen.getByRole("region", { name: /job source summary/i });
        expect(within(statCards).getByText("Working")).toBeInTheDocument();
        expect(within(statCards).getByText("8")).toBeInTheDocument();
      });
    });

    it("displays degraded count", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        const statCards = screen.getByRole("region", { name: /job source summary/i });
        expect(within(statCards).getByText("Having trouble")).toBeInTheDocument();
        // Use aria-label to find specific value
        expect(within(statCards).getByLabelText("Having trouble value: 2")).toBeInTheDocument();
      });
    });

    it("displays down count", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        const statCards = screen.getByRole("region", { name: /job source summary/i });
        expect(within(statCards).getByText("Not working")).toBeInTheDocument();
        expect(within(statCards).getByLabelText("Not working value: 1")).toBeInTheDocument();
      });
    });

    it("displays disabled count", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        const statCards = screen.getByRole("region", { name: /job source summary/i });
        expect(within(statCards).getByText("Off")).toBeInTheDocument();
        expect(within(statCards).getByLabelText("Off value: 2")).toBeInTheDocument();
      });
    });

    it("displays jobs found in 24h", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        const statCards = screen.getByRole("region", { name: /job source summary/i });
        expect(within(statCards).getByText("Jobs found today")).toBeInTheDocument();
        // Value is formatted with toLocaleString(), so 1500 becomes "1,500"
        expect(
          within(statCards).getByLabelText(/Jobs found today value: 1,500/),
        ).toBeInTheDocument();
      });
    });

    it("has accessible region for stats", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByRole("region", { name: /job source summary/i })).toBeInTheDocument();
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
        expect(screen.getByText("Connections Needing Attention")).toBeInTheDocument();
      });
      expect(screen.getByText(/update these saved connections/i)).toBeInTheDocument();
      expect(screen.getByText("Email password")).toBeInTheDocument();
      expect(screen.queryByText("smtp_password")).not.toBeInTheDocument();
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
        expect(screen.getByText("Job Sources")).toBeInTheDocument();
      });
      expect(screen.queryByText("Connections Needing Attention")).not.toBeInTheDocument();
    });

    it("shows expired credential status when provided", async () => {
      const customCredential = {
        ...mockCredentials[0],
        status: "expired" as const,
        days_until_expiry: 0,
      };
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([customCredential]);
        return Promise.resolve(null);
      });

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Expired")).toBeInTheDocument();
      });
    });
  });

  describe("source table", () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        return Promise.resolve(null);
      });
    });

    it("displays source display names", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });
      expect(screen.getByText("USAJobs")).toBeInTheDocument();
      expect(screen.getByText("Glassdoor")).toBeInTheDocument();
      expect(screen.getByText("Monster")).toBeInTheDocument();
    });

    it("does not display internal source ids", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.queryByText("indeed")).not.toBeInTheDocument();
      });
      expect(screen.queryByText("glassdoor")).not.toBeInTheDocument();
    });

    it("shows setup label for sources requiring setup", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Needs setup")).toBeInTheDocument();
      });
    });

    it("displays health status badges", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        // Multiple "Working" texts may appear - one in summary and in table
        const healthyBadges = screen.getAllByText("Working");
        expect(healthyBadges.length).toBeGreaterThan(0);
      });
      // Also check for Having trouble badge in table
      expect(screen.getAllByText("Having trouble").length).toBeGreaterThan(0);
    });

    it("displays plain source kind labels", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByRole("table", { name: /job source status/i })).toBeInTheDocument();
      });
      expect(screen.getByText("Kind")).toBeInTheDocument();
      expect(screen.getAllByText("Website page").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Official source")).toBeInTheDocument();
    });

    it("displays plain recent source status labels", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Recent Status")).toBeInTheDocument();
        expect(screen.queryByText("Checks Worked")).not.toBeInTheDocument();
        expect(screen.getByText("Mostly working")).toBeInTheDocument();
      });
      expect(screen.getByText("Some trouble")).toBeInTheDocument();
      expect(screen.getByText("Needs attention")).toBeInTheDocument();
      expect(screen.queryByText("95%")).not.toBeInTheDocument();
      expect(screen.queryByText("72%")).not.toBeInTheDocument();
      expect(screen.queryByText("35%")).not.toBeInTheDocument();
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
      expect(screen.getByText("from 24 checks")).toBeInTheDocument();
    });

    it("displays relative time for last success", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("30m ago")).toBeInTheDocument();
      });
      expect(screen.getByText("2h ago")).toBeInTheDocument();
    });

    it("shows 'Never' for sources that never succeeded", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Never")).toBeInTheDocument();
      });
    });

    it("displays plain page-read health for website sources", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Can Read Jobs")).toBeInTheDocument();
      });
      expect(screen.queryByText("Page Check")).not.toBeInTheDocument();
      expect(screen.getAllByText("Yes").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Having trouble").length).toBeGreaterThan(0);
      expect(screen.getByText("Cannot read jobs")).toBeInTheDocument();
    });

    it("has accessible table structure", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByRole("table", { name: /job source status/i })).toBeInTheDocument();
      });
    });

    it("shows plain next steps for each source", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Working. No action needed.")).toBeInTheDocument();
      });
      expect(
        screen.getByText("Update connection in Settings if this keeps happening."),
      ).toBeInTheDocument();
      expect(screen.getByText("Off. Turn on if useful.")).toBeInTheDocument();
      expect(screen.getByText("Try again later or turn this source off.")).toBeInTheDocument();
    });

    it("shows visible source control labels instead of icon-only actions", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Actions")).toBeInTheDocument();
      });
      expect(screen.queryByText("Source Controls")).not.toBeInTheDocument();
      expect(screen.getAllByText("Turn Off").length).toBeGreaterThan(0);
      expect(screen.getByText("Turn On")).toBeInTheDocument();
      expect(screen.getAllByText("Check Now").length).toBeGreaterThan(0);
    });
  });

  describe("source actions", () => {
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

    it("toggles source enabled state", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /turn indeed off/i }));

      expect(mockInvoke).toHaveBeenCalledWith("set_scraper_enabled", {
        scraperName: "indeed",
        enabled: false,
      });
    });

    it("runs source check for one source", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /check indeed now/i }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("run_scraper_smoke_test", {
          scraperName: "indeed",
        });
      });
    });
  });

  describe("check history", () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        if (cmd === "get_scraper_runs") return Promise.resolve(mockRuns);
        return Promise.resolve(null);
      });
    });

    it("shows check history when source is selected", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Indeed"));

      await waitFor(() => {
        expect(screen.getByText(/recent checks: indeed/i)).toBeInTheDocument();
      });
    });

    it("loads check history data when source selected", async () => {
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

    it("displays check status badges", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Indeed"));

      await waitFor(() => {
        expect(screen.getByText("Worked")).toBeInTheDocument();
      });
      expect(screen.getByText(/problem found after another try/i)).toBeInTheDocument();
    });

    it("displays job counts in check history", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Indeed"));

      await waitFor(() => {
        const historyPanel = screen.getByRole("region", { name: /recent checks/i });
        expect(within(historyPanel).getByText("15")).toBeInTheDocument();
        expect(within(historyPanel).getByText("+3")).toBeInTheDocument();
      });
    });

    it("displays safe issue guidance in check history", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Indeed"));

      await waitFor(() => {
        expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
      });
      expect(screen.queryByText("Timeout")).not.toBeInTheDocument();
    });

    it("hides check history when same source is clicked again", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Indeed"));
      await waitFor(() => {
        expect(screen.getByText(/recent checks: indeed/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText("Indeed"));
      await waitFor(() => {
        expect(screen.queryByText(/recent checks: indeed/i)).not.toBeInTheDocument();
      });
    });

    it("shows no recent checks message when empty", async () => {
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
        expect(screen.getByText("No recent checks found.")).toBeInTheDocument();
      });
    });
  });

  describe("source check all", () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve(mockScrapers);
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
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

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("run_all_smoke_tests", {});
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
        expect(screen.getByText("Check Sources Now")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Check Sources Now"));

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

      await user.click(screen.getByText("Check Sources Now"));

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

      await user.click(screen.getByText("Check Sources Now"));

      await waitFor(() => {
        expect(screen.getByText("Worked")).toBeInTheDocument();
        expect(screen.getByText("Problem found")).toBeInTheDocument();
      });
    });

    it("displays plain check speeds in results", async () => {
      const user = userEvent.setup();
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Check Sources Now")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Check Sources Now"));

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

      await user.click(screen.getByText("Check Sources Now"));

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

      await user.click(screen.getByText("Check Sources Now"));

      await waitFor(() => {
        expect(screen.getByText("Check Results")).toBeInTheDocument();
      });

      // Find close button in modal
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
        expect(mockInvoke).toHaveBeenCalledWith("get_health_summary", {});
        expect(mockInvoke).toHaveBeenCalledWith("get_scraper_health", {});
        expect(mockInvoke).toHaveBeenCalledWith("get_expiring_credentials", {});
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

    it("formats short checks without millisecond jargon", async () => {
      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("under 1s")).toBeInTheDocument();
      });
    });

    it("shows plain copy for sources not checked yet", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_health_summary") return Promise.resolve(mockSummary);
        if (cmd === "get_scraper_health") return Promise.resolve([mockScrapers[2]]); // Glassdoor with null duration
        if (cmd === "get_expiring_credentials") return Promise.resolve([]);
        return Promise.resolve(null);
      });

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Not checked yet")).toBeInTheDocument();
      });
    });
  });
});
