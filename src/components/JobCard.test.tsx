import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JobCard } from "./JobCard";
import * as shell from "@tauri-apps/plugin-shell";

vi.mock("@tauri-apps/plugin-shell");

const mockJob = {
  id: 1,
  title: "Senior Software Engineer",
  company: "Tech Corp",
  location: "San Francisco, CA",
  url: "https://example.com/job/1",
  source: "LinkedIn",
  score: 0.85,
  created_at: new Date().toISOString(),
  description: "We are looking for a talented software engineer to join our team.",
  salary_min: 120000,
  salary_max: 180000,
  remote: false,
  bookmarked: false,
  notes: null,
};

describe("JobCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders job title and company", () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByTestId("job-title")).toHaveTextContent("Senior Software Engineer");
      expect(screen.getByTestId("job-company")).toHaveTextContent("Tech Corp");
    });

    it("renders with job card container", () => {
      render(<JobCard job={mockJob} />);
      const card = screen.getByTestId("job-card");
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute("data-job-id", "1");
    });

    it("renders location information", () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText("San Francisco, CA")).toBeInTheDocument();
    });

    it("renders remote label when job is remote", () => {
      const remoteJob = { ...mockJob, remote: true };
      render(<JobCard job={remoteJob} />);
      expect(screen.getByText("Remote")).toBeInTheDocument();
    });

    it("renders source information", () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    });

    it("renders salary range when available", () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText("$120k - $180k")).toBeInTheDocument();
    });

    it("renders description snippet when available", () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText(/We are looking for a talented software engineer/)).toBeInTheDocument();
    });

    it("truncates long descriptions", () => {
      const longDesc = "A".repeat(200);
      const jobWithLongDesc = { ...mockJob, description: longDesc };
      const { container } = render(<JobCard job={jobWithLongDesc} />);
      const descElement = container.querySelector(".line-clamp-2");
      expect(descElement?.textContent).toMatch(/\.\.\.$/);
    });

    it("renders view button", () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByTestId("btn-view")).toBeInTheDocument();
    });

    it("does not render description when null", () => {
      const jobNoDesc = { ...mockJob, description: null };
      const { container } = render(<JobCard job={jobNoDesc} />);
      const descElement = container.querySelector(".line-clamp-2");
      expect(descElement).not.toBeInTheDocument();
    });
  });

  describe("score display", () => {
    it("renders score display component", () => {
      const { container } = render(<JobCard job={mockJob} />);
      const scoreDisplay = container.querySelector(".font-mono");
      expect(scoreDisplay).toHaveTextContent("85%");
    });

    it("shows high match indicator for scores >= 0.9", () => {
      const highScoreJob = { ...mockJob, score: 0.95 };
      const { container } = render(<JobCard job={highScoreJob} />);
      const indicator = container.querySelector(".bg-gradient-to-r");
      expect(indicator).toBeInTheDocument();
    });

    it("does not show high match indicator for scores < 0.9", () => {
      const { container } = render(<JobCard job={mockJob} />);
      const indicator = container.querySelector(".bg-gradient-to-r");
      expect(indicator).not.toBeInTheDocument();
    });
  });

  describe("salary formatting", () => {
    it("renders salary with both min and max", () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText("$120k - $180k")).toBeInTheDocument();
    });

    it("renders salary with only min", () => {
      const jobMinOnly = { ...mockJob, salary_min: 100000, salary_max: null };
      render(<JobCard job={jobMinOnly} />);
      expect(screen.getByText("$100k+")).toBeInTheDocument();
    });

    it("renders salary with only max", () => {
      const jobMaxOnly = { ...mockJob, salary_min: null, salary_max: 150000 };
      render(<JobCard job={jobMaxOnly} />);
      expect(screen.getByText("Up to $150k")).toBeInTheDocument();
    });

    it("does not render salary section when both are null", () => {
      const jobNoSalary = { ...mockJob, salary_min: null, salary_max: null };
      render(<JobCard job={jobNoSalary} />);
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });
  });

  describe("date formatting", () => {
    it('shows "Just now" for recent jobs', () => {
      const recentJob = { ...mockJob, created_at: new Date().toISOString() };
      render(<JobCard job={recentJob} />);
      expect(screen.getByText("Just now")).toBeInTheDocument();
    });

    it("shows hours ago for jobs within 24 hours", () => {
      const date = new Date();
      date.setHours(date.getHours() - 5);
      const jobHoursAgo = { ...mockJob, created_at: date.toISOString() };
      render(<JobCard job={jobHoursAgo} />);
      expect(screen.getByText("5h ago")).toBeInTheDocument();
    });

    it("shows days ago for jobs within a week", () => {
      const date = new Date();
      date.setDate(date.getDate() - 3);
      const jobDaysAgo = { ...mockJob, created_at: date.toISOString() };
      render(<JobCard job={jobDaysAgo} />);
      expect(screen.getByText("3d ago")).toBeInTheDocument();
    });

    it("shows date for jobs older than a week", () => {
      const date = new Date();
      date.setDate(date.getDate() - 10);
      const jobOld = { ...mockJob, created_at: date.toISOString() };
      render(<JobCard job={jobOld} />);
      const formatted = date.toLocaleDateString();
      expect(screen.getByText(formatted)).toBeInTheDocument();
    });
  });

  describe("bookmark button", () => {
    it("renders bookmark button when onToggleBookmark is provided", () => {
      const onToggleBookmark = vi.fn();
      render(<JobCard job={mockJob} onToggleBookmark={onToggleBookmark} />);
      expect(screen.getByTestId("btn-bookmark")).toBeInTheDocument();
    });

    it("does not render bookmark button when onToggleBookmark is not provided", () => {
      render(<JobCard job={mockJob} />);
      expect(screen.queryByTestId("btn-bookmark")).not.toBeInTheDocument();
    });

    it("calls onToggleBookmark when clicked", async () => {
      const user = userEvent.setup();
      const onToggleBookmark = vi.fn();
      render(<JobCard job={mockJob} onToggleBookmark={onToggleBookmark} />);

      const bookmarkBtn = screen.getByTestId("btn-bookmark");
      await user.click(bookmarkBtn);

      expect(onToggleBookmark).toHaveBeenCalledWith(1);
    });

    it("shows filled bookmark icon when bookmarked", () => {
      const bookmarkedJob = { ...mockJob, bookmarked: true };
      render(<JobCard job={bookmarkedJob} onToggleBookmark={vi.fn()} />);

      const bookmarkBtn = screen.getByTestId("btn-bookmark");
      expect(bookmarkBtn).toHaveAttribute("data-bookmarked");
      expect(bookmarkBtn).toHaveAttribute("aria-label", "Remove bookmark");
    });

    it("shows empty bookmark icon when not bookmarked", () => {
      render(<JobCard job={mockJob} onToggleBookmark={vi.fn()} />);

      const bookmarkBtn = screen.getByTestId("btn-bookmark");
      expect(bookmarkBtn).not.toHaveAttribute("data-bookmarked");
      expect(bookmarkBtn).toHaveAttribute("aria-label", "Bookmark this job");
    });
  });

  describe("notes button", () => {
    it("renders notes button when onEditNotes is provided", () => {
      const onEditNotes = vi.fn();
      render(<JobCard job={mockJob} onEditNotes={onEditNotes} />);
      expect(screen.getByTestId("btn-notes")).toBeInTheDocument();
    });

    it("does not render notes button when onEditNotes is not provided", () => {
      render(<JobCard job={mockJob} />);
      expect(screen.queryByTestId("btn-notes")).not.toBeInTheDocument();
    });

    it("calls onEditNotes with job id and notes when clicked", async () => {
      const user = userEvent.setup();
      const onEditNotes = vi.fn();
      render(<JobCard job={mockJob} onEditNotes={onEditNotes} />);

      const notesBtn = screen.getByTestId("btn-notes");
      await user.click(notesBtn);

      expect(onEditNotes).toHaveBeenCalledWith(1, null);
    });

    it("shows filled notes icon when notes exist", () => {
      const jobWithNotes = { ...mockJob, notes: "Important company" };
      render(<JobCard job={jobWithNotes} onEditNotes={vi.fn()} />);

      const notesBtn = screen.getByTestId("btn-notes");
      expect(notesBtn).toHaveAttribute("aria-label", "Edit notes");
    });

    it("shows empty notes icon when no notes", () => {
      render(<JobCard job={mockJob} onEditNotes={vi.fn()} />);

      const notesBtn = screen.getByTestId("btn-notes");
      expect(notesBtn).toHaveAttribute("aria-label", "Add notes");
    });
  });

  describe("hide button", () => {
    it("renders hide button when onHideJob is provided", () => {
      const onHideJob = vi.fn();
      render(<JobCard job={mockJob} onHideJob={onHideJob} />);
      expect(screen.getByTestId("btn-hide")).toBeInTheDocument();
    });

    it("does not render hide button when onHideJob is not provided", () => {
      render(<JobCard job={mockJob} />);
      expect(screen.queryByTestId("btn-hide")).not.toBeInTheDocument();
    });

    it("calls onHideJob with job id when clicked", async () => {
      const user = userEvent.setup();
      const onHideJob = vi.fn();
      render(<JobCard job={mockJob} onHideJob={onHideJob} />);

      const hideBtn = screen.getByTestId("btn-hide");
      await user.click(hideBtn);

      expect(onHideJob).toHaveBeenCalledWith(1);
    });

    it("has correct aria-label", () => {
      render(<JobCard job={mockJob} onHideJob={vi.fn()} />);
      const hideBtn = screen.getByTestId("btn-hide");
      expect(hideBtn).toHaveAttribute("aria-label", "Not interested in this job");
    });
  });

  describe("research company button", () => {
    it("renders research button when onResearchCompany is provided", () => {
      const onResearchCompany = vi.fn();
      render(<JobCard job={mockJob} onResearchCompany={onResearchCompany} />);
      expect(screen.getByTestId("btn-research")).toBeInTheDocument();
    });

    it("does not render research button when onResearchCompany is not provided", () => {
      render(<JobCard job={mockJob} />);
      expect(screen.queryByTestId("btn-research")).not.toBeInTheDocument();
    });

    it("calls onResearchCompany with company name when clicked", async () => {
      const user = userEvent.setup();
      const onResearchCompany = vi.fn();
      render(<JobCard job={mockJob} onResearchCompany={onResearchCompany} />);

      const researchBtn = screen.getByTestId("btn-research");
      await user.click(researchBtn);

      expect(onResearchCompany).toHaveBeenCalledWith("Tech Corp");
    });
  });

  describe("view button", () => {
    it("calls onViewJob when provided and clicked", async () => {
      const user = userEvent.setup();
      const onViewJob = vi.fn();
      render(<JobCard job={mockJob} onViewJob={onViewJob} />);

      const viewBtn = screen.getByTestId("btn-view");
      await user.click(viewBtn);

      expect(onViewJob).toHaveBeenCalledWith("https://example.com/job/1");
      expect(shell.open).not.toHaveBeenCalled();
    });

    it("calls shell.open when onViewJob is not provided", async () => {
      const user = userEvent.setup();
      vi.mocked(shell.open).mockResolvedValue();
      render(<JobCard job={mockJob} />);

      const viewBtn = screen.getByTestId("btn-view");
      await user.click(viewBtn);

      expect(shell.open).toHaveBeenCalledWith("https://example.com/job/1");
    });

    it("falls back to window.open when shell.open fails", async () => {
      const user = userEvent.setup();
      const mockWindowOpen = vi.fn();
      (window as typeof globalThis & { open: typeof window.open }).open = mockWindowOpen;
      vi.mocked(shell.open).mockRejectedValue(new Error("Failed"));

      render(<JobCard job={mockJob} />);

      const viewBtn = screen.getByTestId("btn-view");
      await user.click(viewBtn);

      await vi.waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(
          "https://example.com/job/1",
          "_blank",
          "noopener,noreferrer"
        );
      });
    });

    it("has different styling for good match jobs", () => {
      const goodMatchJob = { ...mockJob, score: 0.75 };
      render(<JobCard job={goodMatchJob} />);

      const viewBtn = screen.getByTestId("btn-view");
      expect(viewBtn).toHaveClass("bg-sentinel-50");
    });

    it("has different styling for low match jobs", () => {
      const lowMatchJob = { ...mockJob, score: 0.5 };
      render(<JobCard job={lowMatchJob} />);

      const viewBtn = screen.getByTestId("btn-view");
      expect(viewBtn).toHaveClass("bg-surface-50");
    });
  });

  describe("selected state", () => {
    it("applies selected styles when isSelected is true", () => {
      render(<JobCard job={mockJob} isSelected={true} />);

      const card = screen.getByTestId("job-card");
      expect(card).toHaveAttribute("data-selected");
      expect(card).toHaveClass("ring-2", "ring-sentinel-500");
    });

    it("does not apply selected styles when isSelected is false", () => {
      render(<JobCard job={mockJob} isSelected={false} />);

      const card = screen.getByTestId("job-card");
      expect(card).not.toHaveAttribute("data-selected");
    });
  });

  describe("accessibility", () => {
    it("has accessible labels for all action buttons", () => {
      render(
        <JobCard
          job={mockJob}
          onToggleBookmark={vi.fn()}
          onHideJob={vi.fn()}
          onEditNotes={vi.fn()}
          onResearchCompany={vi.fn()}
        />
      );

      expect(screen.getByLabelText("Bookmark this job")).toBeInTheDocument();
      expect(screen.getByLabelText("Not interested in this job")).toBeInTheDocument();
      expect(screen.getByLabelText("Add notes")).toBeInTheDocument();
      expect(screen.getByLabelText("Research company")).toBeInTheDocument();
    });

    it("has aria-hidden on decorative icons", () => {
      const { container } = render(<JobCard job={mockJob} />);
      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});
