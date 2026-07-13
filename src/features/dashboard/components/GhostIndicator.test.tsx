import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GhostIndicator, GhostIndicatorCompact } from "./GhostIndicator";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

const mockInvoke = vi.mocked(invoke);

async function hoverReviewIndicator() {
  const user = userEvent.setup();
  const indicator = screen.getByLabelText(/posting may need review/i);

  await user.hover(indicator);
  await waitFor(() => {
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  return user;
}

describe("GhostIndicator", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  describe("rendering", () => {
    it("does not render when ghostScore is null", () => {
      const { container } = render(
        <GhostIndicator ghostScore={null} ghostReasons={null} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("does not render when ghostScore is below threshold (0.5)", () => {
      const { container } = render(
        <GhostIndicator ghostScore={0.4} ghostReasons={null} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders when ghostScore is at threshold (0.5)", () => {
      render(<GhostIndicator ghostScore={0.5} ghostReasons={null} />);
      expect(screen.getByText(/needs review/i)).toBeInTheDocument();
    });

    it("renders with low severity for scores 0.5-0.59", () => {
      render(<GhostIndicator ghostScore={0.55} ghostReasons={null} />);
      const indicator = screen.getByText(/needs review/i).parentElement;
      expect(indicator).toHaveClass("bg-yellow-100");
    });

    it("renders with medium severity for scores 0.6-0.74", () => {
      render(<GhostIndicator ghostScore={0.65} ghostReasons={null} />);
      const indicator = screen.getByText(/needs review/i).parentElement;
      expect(indicator).toHaveClass("bg-orange-100");
    });

    it("renders with high severity for scores >= 0.75", () => {
      render(<GhostIndicator ghostScore={0.8} ghostReasons={null} />);
      const indicator = screen.getByText(/verify first/i).parentElement;
      expect(indicator).toHaveClass("bg-red-100");
    });

    it("displays review icon for low/medium severity", () => {
      render(<GhostIndicator ghostScore={0.6} ghostReasons={null} />);
      const svg = screen.getByText(/needs review/i).parentElement?.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("displays warning icon for high severity", () => {
      render(<GhostIndicator ghostScore={0.8} ghostReasons={null} />);
      const svg = screen.getByText(/verify first/i).parentElement?.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders with small size by default", () => {
      render(<GhostIndicator ghostScore={0.6} ghostReasons={null} />);
      const svg = screen.getByText(/needs review/i).parentElement?.querySelector("svg");
      expect(svg).toHaveClass("w-4", "h-4");
    });

    it("renders with medium size when specified", () => {
      render(<GhostIndicator ghostScore={0.6} ghostReasons={null} size="md" />);
      const svg = screen.getByText(/needs review/i).parentElement?.querySelector("svg");
      expect(svg).toHaveClass("w-5", "h-5");
    });
  });

  describe("ghost reasons", () => {
    it("displays parsed reasons in tooltip", async () => {
      const user = userEvent.setup();
      const reasons = JSON.stringify([
        {
          category: "stale",
          description: "Posted over 90 days ago",
          weight: 0.3,
          severity: "high",
        },
      ]);

      render(<GhostIndicator ghostScore={0.8} ghostReasons={reasons} />);

      const indicator = screen.getByText(/verify first/i).parentElement;
      if (indicator) {
        await user.hover(indicator);
        await waitFor(() => {
          expect(screen.getByText(/posted over 90 days ago/i)).toBeInTheDocument();
        });
      }
    });

    it("handles invalid JSON gracefully", () => {
      const { container } = render(
        <GhostIndicator ghostScore={0.8} ghostReasons="invalid json" />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it("ignores non-array JSON reason payloads", () => {
      const { container } = render(
        <GhostIndicator ghostScore={0.8} ghostReasons={'"stale"'} />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    it("keeps valid ghost reasons while ignoring malformed entries", async () => {
      const user = userEvent.setup();
      const reasons = JSON.stringify([
        null,
        { category: "stale", description: "missing fields" },
        {
          category: "stale",
          description: "Posted over 90 days ago",
          weight: 0.3,
          severity: "high",
        },
      ]);

      render(<GhostIndicator ghostScore={0.8} ghostReasons={reasons} />);

      const indicator = screen.getByText(/verify first/i).parentElement;
      if (indicator) {
        await user.hover(indicator);
        await waitFor(() => {
          expect(screen.getByText(/posted over 90 days ago/i)).toBeInTheDocument();
        });
      }
    });

    it("displays multiple reasons", async () => {
      const user = userEvent.setup();
      const reasons = JSON.stringify([
        {
          category: "stale",
          description: "Posted over 90 days ago",
          weight: 0.3,
          severity: "high",
        },
        {
          category: "generic",
          description: "Generic job title",
          weight: 0.2,
          severity: "medium",
        },
      ]);

      render(<GhostIndicator ghostScore={0.8} ghostReasons={reasons} />);

      const indicator = screen.getByText(/verify first/i).parentElement;
      if (indicator) {
        await user.hover(indicator);
        await waitFor(() => {
          expect(screen.getByText(/posted over 90 days ago/i)).toBeInTheDocument();
          expect(screen.getByText(/low-detail posting:/i)).toBeInTheDocument();
          expect(screen.getByText(/generic job title/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe("feedback functionality", () => {
    it("shows feedback buttons when jobId is provided", async () => {
      render(<GhostIndicator ghostScore={0.8} ghostReasons={null} jobId={123} />);

      await hoverReviewIndicator();

      expect(screen.getByRole("button", { name: "Verified" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Needs Review" })).toBeInTheDocument();
    });

    it("does not show feedback buttons without jobId", async () => {
      render(<GhostIndicator ghostScore={0.8} ghostReasons={null} />);

      await hoverReviewIndicator();

      expect(screen.queryByRole("button", { name: "Verified" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Needs Review" })).not.toBeInTheDocument();
    });

    it("calls mark_job_as_real and shows confirmation after verified feedback", async () => {
      mockInvoke.mockResolvedValue(undefined);
      const onFeedbackSubmitted = vi.fn();

      render(<GhostIndicator ghostScore={0.8} ghostReasons={null} jobId={123} onFeedbackSubmitted={onFeedbackSubmitted} />);

      await hoverReviewIndicator();
      fireEvent.click(screen.getByRole("button", { name: "Verified" }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("mark_job_as_real", { jobId: 123 });
      });
      expect(onFeedbackSubmitted).toHaveBeenCalledWith("real");
      expect(screen.getByText(/marked as verified active/i)).toBeInTheDocument();
    });

    it("calls mark_job_as_ghost and shows confirmation after needs-review feedback", async () => {
      mockInvoke.mockResolvedValue(undefined);
      const onFeedbackSubmitted = vi.fn();

      render(
        <GhostIndicator
          ghostScore={0.8}
          ghostReasons={null}
          jobId={123}
          onFeedbackSubmitted={onFeedbackSubmitted}
        />
      );

      await hoverReviewIndicator();
      fireEvent.click(screen.getByRole("button", { name: "Needs Review" }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("mark_job_as_ghost", { jobId: 123 });
      });
      expect(onFeedbackSubmitted).toHaveBeenCalledWith("ghost");
      expect(screen.getByText(/marked as needs review/i)).toBeInTheDocument();
    });

    it("shows an error message when feedback submission fails", async () => {
      const onFeedbackSubmitted = vi.fn();
      mockInvoke.mockRejectedValue(new Error("Network error"));

      render(
        <GhostIndicator
          ghostScore={0.8}
          ghostReasons={null}
          jobId={123}
          onFeedbackSubmitted={onFeedbackSubmitted}
        />
      );

      await hoverReviewIndicator();
      fireEvent.click(screen.getByRole("button", { name: "Verified" }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("mark_job_as_real", { jobId: 123 });
      });
      expect(onFeedbackSubmitted).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/could not save feedback/i);
      });
    });
  });

  describe("accessibility", () => {
    it("has aria-label with a warning level instead of confidence percentage", () => {
      render(<GhostIndicator ghostScore={0.75} ghostReasons={null} />);
      expect(screen.getByLabelText(/posting may need review, high warning/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/75% confidence/i)).not.toBeInTheDocument();
    });

    it("is keyboard focusable so the tooltip can open without a mouse", async () => {
      const user = userEvent.setup();
      render(<GhostIndicator ghostScore={0.75} ghostReasons={null} />);

      const indicator = screen.getByLabelText(/posting may need review, high warning/i);
      await user.tab();

      expect(indicator).toHaveFocus();
      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });
    });

    it("has cursor-help class for tooltip indication", () => {
      render(<GhostIndicator ghostScore={0.75} ghostReasons={null} />);
      const indicator = screen.getByText(/verify first/i).parentElement;
      expect(indicator).toHaveClass("cursor-help");
    });
  });
});

describe("GhostIndicatorCompact", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  describe("rendering", () => {
    it("does not render when ghostScore is null", () => {
      const { container } = render(
        <GhostIndicatorCompact ghostScore={null} ghostReasons={null} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("does not render when ghostScore is below threshold", () => {
      const { container } = render(
        <GhostIndicatorCompact ghostScore={0.4} ghostReasons={null} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders compact indicator when score is above threshold", () => {
      render(<GhostIndicatorCompact ghostScore={0.8} ghostReasons={null} />);
      const indicator = screen.getByLabelText(/posting may need review/i);
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass("w-5", "h-5");
    });

    it("renders with correct severity styling", () => {
      render(<GhostIndicatorCompact ghostScore={0.8} ghostReasons={null} />);
      const indicator = screen.getByLabelText(/posting may need review/i);
      expect(indicator).toHaveClass("bg-red-100");
    });

    it("renders with low severity for scores 0.5-0.59", () => {
      render(<GhostIndicatorCompact ghostScore={0.55} ghostReasons={null} />);
      const indicator = screen.getByLabelText(/posting may need review/i);
      expect(indicator).toHaveClass("bg-yellow-100");
    });

    it("renders with medium severity for scores 0.6-0.74", () => {
      render(<GhostIndicatorCompact ghostScore={0.65} ghostReasons={null} />);
      const indicator = screen.getByLabelText(/posting may need review/i);
      expect(indicator).toHaveClass("bg-orange-100");
    });

    it("shows limited reasons in compact tooltip", async () => {
      const user = userEvent.setup();
      const reasons = JSON.stringify([
        { category: "stale", description: "Reason 1", weight: 0.4, severity: "high" },
        { category: "generic", description: "Reason 2", weight: 0.3, severity: "medium" },
        { category: "repost", description: "Reason 3", weight: 0.2, severity: "low" },
        { category: "unrealistic", description: "Reason 4", weight: 0.1, severity: "low" },
      ]);

      render(<GhostIndicatorCompact ghostScore={0.8} ghostReasons={reasons} />);

      const indicator = screen.getByLabelText(/posting may need review/i);
      await user.hover(indicator);

      await waitFor(() => {
        expect(screen.getByText(/reason 1/i)).toBeInTheDocument();
        expect(screen.getByText(/reason 2/i)).toBeInTheDocument();
        expect(screen.getByText(/reason 3/i)).toBeInTheDocument();
        expect(screen.getByText(/\+1 more details to check/i)).toBeInTheDocument();
      });
    });

    it("shows default message when no reasons", async () => {
      const user = userEvent.setup();
      render(<GhostIndicatorCompact ghostScore={0.8} ghostReasons={null} />);

      const indicator = screen.getByLabelText(/posting may need review/i);
      await user.hover(indicator);

      await waitFor(() => {
        expect(screen.getByText(/this posting may be stale, reposted, or hard to verify/i)).toBeInTheDocument();
      });
    });
  });

  describe("feedback functionality", () => {
    it("shows feedback buttons when jobId is provided", async () => {
      const user = userEvent.setup();
      render(<GhostIndicatorCompact ghostScore={0.8} ghostReasons={null} jobId={456} />);

      const indicator = screen.getByLabelText(/posting may need review/i);
      await user.hover(indicator);

      await waitFor(() => {
        expect(screen.getByTitle("Mark as verified posting")).toBeInTheDocument();
        expect(screen.getByTitle("Mark as stale or unverified")).toBeInTheDocument();
      });
    });

    it("calls mark_job_as_real and shows confirmation after verified feedback", async () => {
      mockInvoke.mockResolvedValue(undefined);
      const onFeedbackSubmitted = vi.fn();

      render(
        <GhostIndicatorCompact
          ghostScore={0.8}
          ghostReasons={null}
          jobId={456}
          onFeedbackSubmitted={onFeedbackSubmitted}
        />
      );

      await hoverReviewIndicator();
      fireEvent.click(screen.getByRole("button", { name: "Verified" }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("mark_job_as_real", { jobId: 456 });
      });
      expect(onFeedbackSubmitted).toHaveBeenCalledWith("real");
      expect(screen.getByText(/marked as verified active/i)).toBeInTheDocument();
    });

    it("calls mark_job_as_ghost and shows confirmation after needs-review feedback", async () => {
      mockInvoke.mockResolvedValue(undefined);
      const onFeedbackSubmitted = vi.fn();

      render(
        <GhostIndicatorCompact
          ghostScore={0.8}
          ghostReasons={null}
          jobId={456}
          onFeedbackSubmitted={onFeedbackSubmitted}
        />
      );

      await hoverReviewIndicator();
      fireEvent.click(screen.getByRole("button", { name: "Needs Review" }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("mark_job_as_ghost", { jobId: 456 });
      });
      expect(onFeedbackSubmitted).toHaveBeenCalledWith("ghost");
      expect(screen.getByText(/marked as needs review/i)).toBeInTheDocument();
    });

    it("shows an error message when feedback submission fails", async () => {
      const onFeedbackSubmitted = vi.fn();
      mockInvoke.mockRejectedValue(new Error("Network error"));

      render(
        <GhostIndicatorCompact
          ghostScore={0.8}
          ghostReasons={null}
          jobId={456}
          onFeedbackSubmitted={onFeedbackSubmitted}
        />
      );

      await hoverReviewIndicator();
      fireEvent.click(screen.getByRole("button", { name: "Verified" }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("mark_job_as_real", { jobId: 456 });
      });
      expect(onFeedbackSubmitted).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/could not save feedback/i);
      });
    });

    it("does not show feedback buttons without jobId", async () => {
      const user = userEvent.setup();

      render(
        <GhostIndicatorCompact
          ghostScore={0.8}
          ghostReasons={null}
        />
      );

      const indicator = screen.getByLabelText(/posting may need review/i);
      await user.hover(indicator);

      // No feedback buttons without jobId
      await waitFor(() => {
        expect(screen.queryByTitle("Mark as verified posting")).not.toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("is keyboard focusable with an accessible warning-level label", async () => {
      const user = userEvent.setup();
      render(<GhostIndicatorCompact ghostScore={0.8} ghostReasons={null} />);

      const indicator = screen.getByLabelText(/posting may need review, high warning/i);
      await user.tab();

      expect(indicator).toHaveFocus();
      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });
    });
  });
});
