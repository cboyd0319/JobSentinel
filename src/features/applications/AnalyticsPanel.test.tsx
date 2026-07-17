import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  cleanupAnalyticsPanelMocks,
  mockCachedInvoke,
  mockOnClose,
  mockStats,
  setupAnalyticsPanelMocks,
} from "./AnalyticsPanel.testSupport";
import { AnalyticsPanel } from "./AnalyticsPanel";

describe("AnalyticsPanel", () => {
  beforeEach(setupAnalyticsPanelMocks);
  afterEach(cleanupAnalyticsPanelMocks);

  describe("loading state", () => {
    it("shows loading skeleton initially", () => {
      mockCachedInvoke.mockImplementation(() => new Promise(() => {}));

      render(<AnalyticsPanel onClose={mockOnClose} />);

      expect(screen.getByRole("dialog", { name: /application summary/i })).toBeInTheDocument();
      expect(screen.getByRole("status", { name: /loading application summary/i })).toBeInTheDocument();
      expect(document.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
    });

    it("shows loading dialog while fetching", () => {
      mockCachedInvoke.mockImplementation(() => new Promise(() => {}));

      render(<AnalyticsPanel onClose={mockOnClose} />);

      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });
  });

  describe("error state", () => {
    it("shows error message on fetch failure", async () => {
      mockCachedInvoke.mockRejectedValue(new Error("Network error"));

      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Could not load application summary. Try again, or copy a safe support report if this keeps happening.",
          )
        ).toBeInTheDocument();
      });
    });

    it("shows retry button on error", async () => {
      mockCachedInvoke.mockRejectedValue(new Error("Network error"));

      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
      });
    });

    it("retries fetch when retry button is clicked", async () => {
      mockCachedInvoke.mockRejectedValueOnce(new Error("Network error"));
      mockCachedInvoke.mockResolvedValueOnce(mockStats);

      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /try again/i }));

      await waitFor(() => {
        expect(mockCachedInvoke).toHaveBeenCalledTimes(2);
      });
    });

    it("shows close button on error", async () => {
      mockCachedInvoke.mockRejectedValue(new Error("Network error"));

      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
      });
    });

    it("calls onClose when close button is clicked on error", async () => {
      mockCachedInvoke.mockRejectedValue(new Error("Network error"));

      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /close/i }));
      });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("successful render", () => {
    it("shows analytics title", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });
    });

    it("shows total applications metric", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("50")).toBeInTheDocument();
        expect(screen.getByText("Total Applications")).toBeInTheDocument();
      });
    });

    it("shows employer replies metric", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("45.5%")).toBeInTheDocument();
        expect(screen.getByText("Employer replies")).toBeInTheDocument();
      });
    });

    it("shows offers received metric", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("6.0%")).toBeInTheDocument();
        expect(screen.getByText("Offers received")).toBeInTheDocument();
      });
    });

    it("shows in progress count", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      // In progress = applied + screening + phone + technical + onsite = 15+5+3+2+1 = 26
      await waitFor(() => {
        expect(screen.getByText("26")).toBeInTheDocument();
        expect(screen.getByText("In Progress")).toBeInTheDocument();
      });
    });

    it("renders status distribution section", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Application Status")).toBeInTheDocument();
      });
    });

    it("renders application funnel section", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Application Progress")).toBeInTheDocument();
        expect(screen.queryByText("Application Funnel")).not.toBeInTheDocument();
      });
    });

    it("renders weekly applications section", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Weekly Applications (Last 12 Weeks)")).toBeInTheDocument();
      });
    });

    it("renders performance by source section", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Replies by Job Source")).toBeInTheDocument();
        expect(screen.queryByText("Performance by Job Source")).not.toBeInTheDocument();
      });
    });

    it("displays source names with proper labels", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("LinkedIn job board")).toBeInTheDocument();
        expect(screen.getByText("Greenhouse hiring page")).toBeInTheDocument();
        expect(screen.getByText("Connected job source")).toBeInTheDocument();
        expect(screen.queryByText("JobsWithGPT")).not.toBeInTheDocument();
      });
    });

    it("renders average response time", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Average Reply Time")).toBeInTheDocument();
        expect(screen.getByText("7.5")).toBeInTheDocument();
      });
    });

    it("renders company response times", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Employer Reply Times")).toBeInTheDocument();
        // FastCorp may appear in multiple lists, use getAllByText
        expect(screen.getAllByText("FastCorp").length).toBeGreaterThan(0);
        expect(screen.getAllByText("SlowCo").length).toBeGreaterThan(0);
      });
    });

    it("renders detailed status breakdown", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Status Details")).toBeInTheDocument();
        expect(screen.getByText("Applied")).toBeInTheDocument();
        expect(screen.getByText("Not Selected")).toBeInTheDocument();
      });
    });
  });

  describe("close functionality", () => {
    it("calls onClose when close button is clicked", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close application summary/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /close application summary/i }));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onClose when Escape key is pressed", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onClose when clicking overlay", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      fireEvent.click(dialog);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("date range filter", () => {
    it("renders date range dropdown", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        const select = screen.getByRole("combobox");
        expect(select).toBeInTheDocument();
      });
    });

    it("has all time selected by default", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        const select = screen.getByRole("combobox") as HTMLSelectElement;
        expect(select.value).toBe("all");
      });
    });

    it("fetches data with date filter when changed", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "30" } });

      await waitFor(() => {
        expect(mockCachedInvoke).toHaveBeenCalledWith(
          "get_application_stats",
          { days: 30 },
          30_000
        );
      });
    });

    it("fetches data without filter for all time", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(mockCachedInvoke).toHaveBeenCalledWith(
          "get_application_stats",
          undefined,
          30_000
        );
      });
    });
  });

  describe("download functionality", () => {
    it("renders download button", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
      });
    });

    it("creates download link when export is clicked", async () => {
      const mockCreateElement = vi.spyOn(document, "createElement");
      const mockCreateObjectURL = vi.fn(() => "blob:test");
      const mockRevokeObjectURL = vi.fn();
      const anchorClickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => undefined);
      URL.createObjectURL = mockCreateObjectURL;
      URL.revokeObjectURL = mockRevokeObjectURL;

      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /download/i }));

      expect(mockCreateElement).toHaveBeenCalledWith("a");
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(anchorClickSpy).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();

      mockCreateElement.mockRestore();
      anchorClickSpy.mockRestore();
    });
  });

});
