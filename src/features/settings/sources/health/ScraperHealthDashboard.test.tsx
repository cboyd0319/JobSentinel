import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScraperHealthDashboard } from "./ScraperHealthDashboard";
import {
  mockCredentials,
  mockScrapers,
  mockSummary,
} from "./ScraperHealthDashboard.testData";

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock error utils
vi.mock("../../../../shared/errorReporting/logger", () => ({
  logError: vi.fn(),
}));

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
        new Error("token=raw-secret private@example.test resume=private-file")
      );

      render(<ScraperHealthDashboard onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/safe support report/i)).toBeInTheDocument();
      });
      expect(screen.queryByText(/raw-secret|private@example\.test|resume=private-file/)).not.toBeInTheDocument();
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

});
