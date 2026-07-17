import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  cleanupAnalyticsPanelMocks,
  mockCachedInvoke,
  mockOnClose,
  mockStats,
  setupAnalyticsPanelMocks,
} from "./AnalyticsPanel.testSupport";
import { AnalyticsPanel } from "./AnalyticsPanel";

describe("AnalyticsPanel goals and empty states", () => {
  beforeEach(setupAnalyticsPanelMocks);
  afterEach(cleanupAnalyticsPanelMocks);

  describe("weekly goal tracker", () => {
    it("shows set goal button when no goal is set", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Weekly Application Plan")).toBeInTheDocument();
        expect(screen.getByText("Set Plan")).toBeInTheDocument();
        expect(screen.queryByText("Weekly Application Goal")).not.toBeInTheDocument();
      });
    });

    it("shows goal input when set goal is clicked", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Set Plan"));
      });

      expect(screen.getByLabelText(/weekly application plan/i)).toBeInTheDocument();
    });

    it("saves goal when save button is clicked", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Set Plan"));
      });

      const input = screen.getByLabelText(/weekly application plan/i);
      fireEvent.change(input, { target: { value: "20" } });

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it("shows cancel button in goal input", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Set Plan"));
      });

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("hides goal input when cancel is clicked", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Set Plan"));
      });

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(screen.queryByLabelText(/weekly application plan/i)).not.toBeInTheDocument();
    });

    it("shows prompt message when no goal is set", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(
          screen.getByText("Set a weekly plan to pace your applications"),
        ).toBeInTheDocument();
      });
    });

    it("ignores malformed stored weekly goals", async () => {
      window.localStorage.setItem(
        "jobsentinel_weekly_goals",
        JSON.stringify({
          target: "20",
          weekStart: new Date().toISOString(),
        }),
      );

      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(
          screen.getByText("Set a weekly plan to pace your applications"),
        ).toBeInTheDocument();
      });
      expect(screen.getByText("Set Plan")).toBeInTheDocument();
    });

    it("allows entering goal value in input", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Set Plan"));
      });

      const input = screen.getByLabelText(/weekly application plan/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "25" } });

      expect(input.value).toBe("25");
    });

    it("has min value of 1 on goal input", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Set Plan"));
      });

      const input = screen.getByLabelText(/weekly application plan/i);
      expect(input).toHaveAttribute("min", "1");
    });
  });

  describe("no data states", () => {
    it("shows message when no pie data", async () => {
      mockCachedInvoke.mockResolvedValue({
        ...mockStats,
        by_status: {
          to_apply: 0,
          applied: 0,
          screening_call: 0,
          phone_interview: 0,
          technical_interview: 0,
          onsite_interview: 0,
          offer_received: 0,
          offer_accepted: 0,
          offer_rejected: 0,
          rejected: 0,
          ghosted: 0,
          withdrawn: 0,
        },
      });

      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("No application data yet")).toBeInTheDocument();
      });
    });

    it("hides weekly applications when empty", async () => {
      mockCachedInvoke.mockResolvedValue({
        ...mockStats,
        weekly_applications: [],
      });

      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(
          screen.queryByText("Weekly Applications (Last 12 Weeks)"),
        ).not.toBeInTheDocument();
      });
    });

    it("hides source section when no sources", async () => {
      mockCachedInvoke.mockResolvedValue({
        ...mockStats,
        by_source: undefined,
      });

      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.queryByText("Replies by Job Source")).not.toBeInTheDocument();
      });
    });

    it("hides response time when zero", async () => {
      mockCachedInvoke.mockResolvedValue({
        ...mockStats,
        avg_response_days: 0,
      });

      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.queryByText("Average Reply Time")).not.toBeInTheDocument();
      });
    });
  });

  describe("company response times", () => {
    it("shows fastest responders section", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Fastest Replies")).toBeInTheDocument();
      });
    });

    it("shows slowest responders section", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Slowest Replies")).toBeInTheDocument();
      });
    });

    it("shows awaiting reply section", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/awaiting reply/i)).toBeInTheDocument();
        expect(screen.getByText("NoResponse Inc")).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("has dialog role", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("has aria-modal true", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
      });
    });

    it("has aria-labelledby pointing to title", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        const title = screen.getByRole("heading", { name: /application summary/i });
        expect(dialog).toHaveAttribute("aria-labelledby", title.id);
      });
    });

    it("close button has aria-label", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /close application summary/i }),
        ).toBeInTheDocument();
      });
    });
  });
});
