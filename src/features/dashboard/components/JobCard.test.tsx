import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { JobCard } from "./JobCard";
import { ToastProvider } from "../../../app/providers/ToastProvider";
import {
  BROWSER_ASSIST_LEARNING_ENABLED_STORAGE_KEY,
  BROWSER_ASSIST_LEARNING_STORAGE_KEY,
} from "../../../shared/browserAssistLearning";

vi.mock("../../../shared/search-links", () => ({
  openDeepLink: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const { invoke } = await import("@tauri-apps/api/core");
const mockInvoke = vi.mocked(invoke);

// Helper to wrap component with ToastProvider
const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

const mockJob = {
  id: 1,
  title: "Customer Support Lead",
  company: "CareBridge Services",
  location: "Chicago, IL",
  url: "https://example.com/job/1",
  source: "LinkedIn",
  score: 0.85,
  created_at: new Date().toISOString(),
  description:
    "We are looking for a helpful support lead to guide our care team.",
  salary_min: 55000,
  salary_max: 72000,
  remote: false,
  bookmarked: false,
  notes: null,
};

describe("JobCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
    window.localStorage.clear();
  });

  describe("rendering", () => {
    it("renders job title and company", () => {
      renderWithToast(<JobCard job={mockJob} />);
      expect(screen.getByTestId("job-title")).toHaveTextContent(
        "Customer Support Lead",
      );
      expect(screen.getByTestId("job-company")).toHaveTextContent(
        "CareBridge Services",
      );
    });

    it("renders with job card container", () => {
      renderWithToast(<JobCard job={mockJob} />);
      const card = screen.getByTestId("job-card");
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute("data-job-id", "1");
    });

    it("renders location information", () => {
      renderWithToast(<JobCard job={mockJob} />);
      expect(screen.getByText("Chicago, IL")).toBeInTheDocument();
    });

    it("renders remote label when job is remote", () => {
      const remoteJob = { ...mockJob, remote: true };
      renderWithToast(<JobCard job={remoteJob} />);
      expect(screen.getByText("Remote")).toBeInTheDocument();
    });

    it("renders plain source information", () => {
      renderWithToast(<JobCard job={mockJob} />);
      expect(screen.getByText("LinkedIn job board")).toBeInTheDocument();
      expect(screen.getByTestId("source-review-guidance")).toHaveTextContent(
        "Verify employer page",
      );
      expect(screen.getByText(/Job-board listings can lag/i)).toBeInTheDocument();
    });

    it("labels employer-side hiring sources without raw source IDs", () => {
      const greenhouseJob = { ...mockJob, source: "greenhouse" };

      renderWithToast(<JobCard job={greenhouseJob} />);

      expect(screen.getByText("Greenhouse hiring page")).toBeInTheDocument();
      expect(screen.queryByText("greenhouse")).not.toBeInTheDocument();
      expect(
        screen.getByLabelText(/source: greenhouse hiring page/i),
      ).toHaveAccessibleDescription(/closer to the employer source/i);
      expect(screen.queryByTestId("source-review-guidance")).not.toBeInTheDocument();
    });

    it("labels connected and imported sources in plain language", () => {
      const { rerender } = renderWithToast(
        <JobCard job={{ ...mockJob, source: "jobswithgpt" }} />,
      );

      expect(screen.getByText("Connected job source")).toBeInTheDocument();
      expect(screen.getByText("Verify connected source")).toBeInTheDocument();
      expect(screen.queryByText("jobswithgpt")).not.toBeInTheDocument();

      rerender(
        <ToastProvider>
          <JobCard job={{ ...mockJob, source: "import" }} />
        </ToastProvider>,
      );

      expect(screen.getByText("Saved by you")).toBeInTheDocument();
      expect(screen.getByText("Check saved link")).toBeInTheDocument();
      expect(screen.queryByText("import")).not.toBeInTheDocument();
    });

    it("cleans unknown source IDs before rendering", () => {
      renderWithToast(<JobCard job={{ ...mockJob, source: "city_careers" }} />);

      expect(screen.getByText("City Careers")).toBeInTheDocument();
      expect(screen.getByText("Check source before tailoring")).toBeInTheDocument();
      expect(screen.queryByText("city_careers")).not.toBeInTheDocument();
    });

    it("surfaces missing source data as a review cue", () => {
      renderWithToast(<JobCard job={{ ...mockJob, source: "   " }} />);

      expect(screen.getAllByText("Source not shown").length).toBeGreaterThan(0);
      expect(
        screen.getByText(/No source was recorded for this posting/i),
      ).toBeInTheDocument();
    });

    it("shows visible review guidance for unsafe saved links", () => {
      renderWithToast(<JobCard job={{ ...mockJob, url: "javascript:alert(1)" }} />);

      expect(screen.getByTestId("job-link-guidance")).toHaveTextContent("Check job link");
      expect(
        screen.getByText(/This saved job link does not look safe to open/i),
      ).toBeInTheDocument();
    });

    it("renders salary range when available", () => {
      renderWithToast(<JobCard job={mockJob} />);
      expect(screen.getByText("$55k - $72k")).toBeInTheDocument();
    });

    it("shows malformed listed-pay guidance without treating it as a range", () => {
      const malformedPayJob = {
        ...mockJob,
        salary_min: 120000,
        salary_max: 70000,
      };

      renderWithToast(<JobCard job={malformedPayJob} />);

      expect(screen.getByText("Pay not listed")).toBeInTheDocument();
      expect(screen.getByTestId("salary-range-quality-guidance")).toHaveTextContent(
        "Check listed pay",
      );
      expect(
        screen.getByText(/could not be read as a usable range/i),
      ).toBeInTheDocument();
    });

    it("explains repeat sightings without claiming separate sources", () => {
      renderWithToast(<JobCard job={{ ...mockJob, times_seen: 3 }} />);

      expect(screen.getByText("Seen 3 times")).toBeInTheDocument();
      expect(screen.queryByText("Seen on 3 sources")).not.toBeInTheDocument();
      expect(screen.queryByText("3x")).not.toBeInTheDocument();
    });

    it("renders description snippet when available", () => {
      renderWithToast(<JobCard job={mockJob} />);
      expect(
        screen.getByText(/We are looking for a helpful support lead/),
      ).toBeInTheDocument();
    });

    it("shows Prepare Form when Application Assist is available", async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "detect_ats_platform") {
          return Promise.resolve({
            platform: "greenhouse",
            commonFields: ["email", "phone", "name"],
            automationNotes: null,
          });
        }
        if (cmd === "has_application_profile") return Promise.resolve(true);
        if (cmd === "is_browser_running") return Promise.resolve(false);
        return Promise.resolve(null);
      });

      renderWithToast(
        <JobCard
          job={mockJob}
          renderApplicationAssistAction={() => (
            <button type="button">Prepare form</button>
          )}
        />,
      );

      expect(await screen.findByRole("button", { name: /prepare form/i })).toBeInTheDocument();
    });

    it("truncates long descriptions", () => {
      const longDesc = "A".repeat(200);
      const jobWithLongDesc = { ...mockJob, description: longDesc };
      const { container } = renderWithToast(<JobCard job={jobWithLongDesc} />);
      const descElement = container.querySelector(".line-clamp-2");
      expect(descElement?.textContent).toMatch(/\.\.\.$/);
    });

    it("renders view button", () => {
      renderWithToast(<JobCard job={mockJob} />);
      expect(screen.getByTestId("btn-view")).toBeInTheDocument();
    });

    it("does not render description when null", () => {
      const jobNoDesc = { ...mockJob, description: null };
      const { container } = renderWithToast(<JobCard job={jobNoDesc} />);
      const descElement = container.querySelector(".line-clamp-2");
      expect(descElement).not.toBeInTheDocument();
    });
  });

  describe("score display", () => {
    it("renders score display component", () => {
      const { container } = renderWithToast(<JobCard job={mockJob} />);
      const scoreDisplay = container.querySelector(".font-mono");
      expect(scoreDisplay).toHaveTextContent("85%");
    });

    it("shows high match indicator for scores >= 0.9", () => {
      const highScoreJob = { ...mockJob, score: 0.95 };
      const { container } = renderWithToast(<JobCard job={highScoreJob} />);
      const indicator = container.querySelector(".bg-gradient-to-r");
      expect(indicator).toBeInTheDocument();
    });

    it("does not show high match indicator for scores < 0.9", () => {
      const { container } = renderWithToast(<JobCard job={mockJob} />);
      const indicator = container.querySelector(".bg-gradient-to-r");
      expect(indicator).not.toBeInTheDocument();
    });

    it("handles null score without crashing", () => {
      const nullScoreJob = { ...mockJob, score: null };
      renderWithToast(<JobCard job={nullScoreJob} />);
      const scoreDisplay = screen.getByText("--");
      expect(scoreDisplay).toBeInTheDocument();
      expect(screen.queryByText("0%")).not.toBeInTheDocument();
    });

    it("handles NaN score without crashing", () => {
      const nanScoreJob = { ...mockJob, score: NaN };
      renderWithToast(<JobCard job={nanScoreJob} />);
      const scoreDisplay = screen.getByText("--");
      expect(scoreDisplay).toBeInTheDocument();
      expect(screen.queryByText("0%")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /fit estimate/i }),
      ).not.toBeInTheDocument();
    });

    it("does not show high match indicator for NaN score", () => {
      const nanScoreJob = { ...mockJob, score: NaN };
      const { container } = renderWithToast(<JobCard job={nanScoreJob} />);
      const indicator = container.querySelector(".bg-gradient-to-r");
      expect(indicator).not.toBeInTheDocument();
    });

    it("handles Infinity score without crashing", () => {
      const infScoreJob = { ...mockJob, score: Infinity };
      renderWithToast(<JobCard job={infScoreJob} />);
      const scoreDisplay = screen.getByText("--");
      expect(scoreDisplay).toBeInTheDocument();
      expect(screen.queryByText("0%")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /fit estimate/i }),
      ).not.toBeInTheDocument();
    });

    it("does not show high match styling for out-of-range scores", () => {
      const outOfRangeJob = { ...mockJob, score: 1.5 };
      const { container } = renderWithToast(<JobCard job={outOfRangeJob} />);

      expect(screen.getByText("--")).toBeInTheDocument();
      expect(screen.queryByText("150%")).not.toBeInTheDocument();
      expect(container.querySelector(".bg-gradient-to-r")).not.toBeInTheDocument();
      expect(
        screen.getByRole("article", { name: /customer support lead/i }),
      ).not.toHaveAccessibleName(/high match|good match/i);
    });

    it("lets the user raise a local fit estimate with useful feedback", async () => {
      const user = userEvent.setup();
      renderWithToast(<JobCard job={mockJob} />);

      expect(screen.getByText("85%")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /mark useful/i }));

      expect(screen.getByText("90%")).toBeInTheDocument();
      expect(screen.getByTestId("job-feedback-adjustment")).toHaveTextContent(
        "Raised by your feedback",
      );
      expect(screen.getByTestId("job-feedback-adjustment")).toHaveTextContent(
        "does not predict employer intent",
      );
    });

    it("adds useful feedback to local learning only when learning is on", async () => {
      const user = userEvent.setup();
      window.localStorage.setItem(
        BROWSER_ASSIST_LEARNING_ENABLED_STORAGE_KEY,
        "true",
      );

      renderWithToast(<JobCard job={mockJob} />);

      await user.click(screen.getByRole("button", { name: /mark useful/i }));

      expect(window.localStorage.getItem(BROWSER_ASSIST_LEARNING_STORAGE_KEY)).toContain(
        "Customer Support Lead",
      );
      expect(window.localStorage.getItem(BROWSER_ASSIST_LEARNING_STORAGE_KEY)).toContain(
        "CareBridge Services",
      );
      expect(window.localStorage.getItem(BROWSER_ASSIST_LEARNING_STORAGE_KEY)).not.toContain(
        mockJob.url,
      );
    });

    it("lets the user lower a local fit estimate with not-for-me feedback", async () => {
      const user = userEvent.setup();
      renderWithToast(<JobCard job={mockJob} />);

      await user.click(screen.getByRole("button", { name: /mark not for me/i }));

      expect(screen.getByText("73%")).toBeInTheDocument();
      expect(screen.getByTestId("job-feedback-adjustment")).toHaveTextContent(
        "Lowered by your feedback",
      );
    });
  });

  describe("salary formatting", () => {
    it("renders salary with both min and max", () => {
      renderWithToast(<JobCard job={mockJob} />);
      expect(screen.getByText("$55k - $72k")).toBeInTheDocument();
    });

    it("renders salary with only min", () => {
      const jobMinOnly = { ...mockJob, salary_min: 100000, salary_max: null };
      renderWithToast(<JobCard job={jobMinOnly} />);
      expect(screen.getByText("$100k+")).toBeInTheDocument();
      expect(screen.getByTestId("salary-range-quality-guidance")).toHaveTextContent(
        "Open-ended listed pay",
      );
      expect(
        screen.getByText(/confirm the realistic top range before tailoring/i),
      ).toBeInTheDocument();
    });

    it("renders salary with only max", () => {
      const jobMaxOnly = { ...mockJob, salary_min: null, salary_max: 150000 };
      renderWithToast(<JobCard job={jobMaxOnly} />);
      expect(screen.getByText("Up to $150k")).toBeInTheDocument();
      expect(screen.getByTestId("salary-range-quality-guidance")).toHaveTextContent(
        "Top-only listed pay",
      );
      expect(
        screen.getByText(/confirm the starting pay before tailoring/i),
      ).toBeInTheDocument();
    });

    it("shows a missing-pay cue when both salary fields are null", () => {
      const jobNoSalary = { ...mockJob, salary_min: null, salary_max: null };
      renderWithToast(<JobCard job={jobNoSalary} />);
      expect(screen.getByText("Pay not listed")).toBeInTheDocument();
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
      expect(screen.queryByTestId("pay-floor-guidance")).not.toBeInTheDocument();
      expect(
        screen.getByRole("article", {
          name: /pay not listed/i,
        }),
      ).toBeInTheDocument();
    });

    it("shows regional pay-range guidance when a covered location has no listed pay", () => {
      const coloradoJobNoSalary = {
        ...mockJob,
        location: "Denver, CO",
        salary_min: null,
        salary_max: null,
      };

      renderWithToast(<JobCard job={coloradoJobNoSalary} />);

      expect(screen.getByTestId("pay-transparency-guidance")).toHaveTextContent(
        "Check pay range",
      );
      expect(screen.getByTestId("pay-transparency-guidance")).toHaveTextContent(
        "Colorado has pay-range posting rules for covered employers",
      );
      expect(
        screen.getByRole("article", {
          name: /pay range to check for colorado/i,
        }),
      ).toBeInTheDocument();
    });

    it("shows missing-pay floor guidance when salary floor exists", () => {
      const jobNoSalary = { ...mockJob, salary_min: null, salary_max: null };

      renderWithToast(<JobCard job={jobNoSalary} salaryFloorUsd={65000} />);

      const guidance = screen.getByTestId("pay-floor-guidance");
      expect(guidance).toHaveTextContent("Pay not listed");
      expect(guidance).toHaveTextContent(
        "No pay range is listed. Compare this role with your $65,000/year floor before tailoring.",
      );
      expect(
        screen.getByRole("article", {
          name: /pay not listed; compare before tailoring/i,
        }),
      ).toBeInTheDocument();
    });

    it("flags very wide listed pay ranges as weaker range evidence", () => {
      const wideRangeJob = {
        ...mockJob,
        salary_min: 45000,
        salary_max: 140000,
      };

      renderWithToast(<JobCard job={wideRangeJob} />);

      expect(screen.getByText("$45k - $140k")).toBeInTheDocument();
      expect(screen.getByTestId("salary-range-quality-guidance")).toHaveTextContent(
        "Very wide pay range",
      );
      expect(
        screen.getByText(/check the written level, schedule, and realistic pay/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("article", {
          name: /very wide pay range/i,
        }),
      ).toBeInTheDocument();
    });

    it("keeps normal listed pay ranges visually quiet", () => {
      renderWithToast(<JobCard job={mockJob} />);

      expect(screen.getByText("$55k - $72k")).toBeInTheDocument();
      expect(screen.queryByTestId("salary-range-quality-guidance")).not.toBeInTheDocument();
    });

    it("warns when listed pay is below the user's floor", () => {
      const belowFloorJob = {
        ...mockJob,
        salary_min: 45000,
        salary_max: 55000,
      };

      renderWithToast(
        <JobCard job={belowFloorJob} salaryFloorUsd={65000} />,
      );

      expect(screen.getByTestId("pay-floor-guidance")).toHaveTextContent(
        "Below the lowest pay you want",
      );
      expect(
        screen.getByText(/listed pay tops out below \$65,000\/year/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("article", {
          name: /below the lowest pay you want/i,
        }),
      ).toBeInTheDocument();
    });

    it("does not warn when listed pay starts at the user's floor", () => {
      const atFloorJob = {
        ...mockJob,
        salary_min: 65000,
        salary_max: 72000,
      };

      renderWithToast(<JobCard job={atFloorJob} salaryFloorUsd={65000} />);

      expect(screen.getByText("$65k - $72k")).toBeInTheDocument();
      expect(screen.queryByTestId("pay-floor-guidance")).not.toBeInTheDocument();
    });

    it("warns when listed pay starts below the user's floor", () => {
      const lowStartJob = {
        ...mockJob,
        salary_min: 55000,
        salary_max: 72000,
      };

      renderWithToast(<JobCard job={lowStartJob} salaryFloorUsd={65000} />);

      expect(screen.getByText("$55k - $72k")).toBeInTheDocument();
      expect(screen.getByTestId("pay-floor-guidance")).toHaveTextContent(
        "Starting pay below your floor",
      );
      expect(
        screen.getByText(/confirm where your experience would land before tailoring/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("article", {
          name: /starting pay below your floor; confirm range before tailoring/i,
        }),
      ).toBeInTheDocument();
    });

    it("shows a review cue when only starting pay is below the user's floor", () => {
      const minOnlyJob = {
        ...mockJob,
        salary_min: 45000,
        salary_max: null,
      };

      renderWithToast(<JobCard job={minOnlyJob} salaryFloorUsd={65000} />);

      expect(screen.getByText("$45k+")).toBeInTheDocument();
      expect(screen.getByTestId("pay-floor-guidance")).toHaveTextContent(
        "Open-ended listed pay",
      );
      expect(
        screen.getByText(/confirm the realistic top range before tailoring/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("article", {
          name: /below the lowest pay you want/i,
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("article", {
          name: /open-ended listed pay; confirm range before tailoring/i,
        }),
      ).toBeInTheDocument();
    });

    it("treats reversed listed pay as unavailable for floor guidance", () => {
      const reversedRangeJob = {
        ...mockJob,
        salary_min: 150000,
        salary_max: 80000,
      };

      renderWithToast(
        <JobCard job={reversedRangeJob} salaryFloorUsd={100000} />,
      );

      expect(screen.getByTestId("pay-floor-guidance")).toHaveTextContent(
        "Pay not listed",
      );
      expect(screen.queryByText("$150k - $80k")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("article", {
          name: /below the lowest pay you want/i,
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe("date formatting", () => {
    it('shows "Just now" for recent jobs', () => {
      const recentJob = { ...mockJob, created_at: new Date().toISOString() };
      renderWithToast(<JobCard job={recentJob} />);
      expect(screen.getByText("Just now")).toBeInTheDocument();
    });

    it("shows hours ago for jobs within 24 hours", () => {
      const date = new Date();
      date.setHours(date.getHours() - 5);
      const jobHoursAgo = { ...mockJob, created_at: date.toISOString() };
      renderWithToast(<JobCard job={jobHoursAgo} />);
      expect(screen.getByText("5h ago")).toBeInTheDocument();
    });

    it("shows days ago for jobs within a week", () => {
      const date = new Date();
      date.setDate(date.getDate() - 3);
      const jobDaysAgo = { ...mockJob, created_at: date.toISOString() };
      renderWithToast(<JobCard job={jobDaysAgo} />);
      expect(screen.getByText("3d ago")).toBeInTheDocument();
    });

    it("shows date for jobs older than a week", () => {
      const date = new Date();
      date.setDate(date.getDate() - 10);
      const jobOld = { ...mockJob, created_at: date.toISOString() };
      renderWithToast(<JobCard job={jobOld} />);
      const formatted = date.toLocaleDateString();
      expect(screen.getByText(formatted)).toBeInTheDocument();
    });
  });

  describe("bookmark button", () => {
    it("renders bookmark button when onToggleBookmark is provided", () => {
      const onToggleBookmark = vi.fn();
      renderWithToast(
        <JobCard job={mockJob} onToggleBookmark={onToggleBookmark} />,
      );
      expect(screen.getByTestId("btn-bookmark")).toBeInTheDocument();
    });

    it("does not render bookmark button when onToggleBookmark is not provided", () => {
      renderWithToast(<JobCard job={mockJob} />);
      expect(screen.queryByTestId("btn-bookmark")).not.toBeInTheDocument();
    });

    it("calls onToggleBookmark when clicked", async () => {
      const user = userEvent.setup();
      const onToggleBookmark = vi.fn();
      renderWithToast(
        <JobCard job={mockJob} onToggleBookmark={onToggleBookmark} />,
      );

      const bookmarkBtn = screen.getByTestId("btn-bookmark");
      await user.click(bookmarkBtn);

      expect(onToggleBookmark).toHaveBeenCalledWith(1);
    });

    it("shows filled bookmark icon when bookmarked", () => {
      const bookmarkedJob = { ...mockJob, bookmarked: true };
      renderWithToast(
        <JobCard job={bookmarkedJob} onToggleBookmark={vi.fn()} />,
      );

      const bookmarkBtn = screen.getByTestId("btn-bookmark");
      expect(bookmarkBtn).toHaveAttribute("data-bookmarked");
      expect(bookmarkBtn).toHaveAttribute("aria-label", "Remove bookmark");
    });

    it("shows empty bookmark icon when not bookmarked", () => {
      renderWithToast(<JobCard job={mockJob} onToggleBookmark={vi.fn()} />);

      const bookmarkBtn = screen.getByTestId("btn-bookmark");
      expect(bookmarkBtn).not.toHaveAttribute("data-bookmarked");
      expect(bookmarkBtn).toHaveAttribute("aria-label", "Bookmark this job");
    });
  });

  describe("notes button", () => {
    it("renders notes button when onEditNotes is provided", () => {
      const onEditNotes = vi.fn();
      renderWithToast(<JobCard job={mockJob} onEditNotes={onEditNotes} />);
      expect(screen.getByTestId("btn-notes")).toBeInTheDocument();
    });

    it("does not render notes button when onEditNotes is not provided", () => {
      renderWithToast(<JobCard job={mockJob} />);
      expect(screen.queryByTestId("btn-notes")).not.toBeInTheDocument();
    });

    it("calls onEditNotes with job id and notes when clicked", async () => {
      const user = userEvent.setup();
      const onEditNotes = vi.fn();
      renderWithToast(<JobCard job={mockJob} onEditNotes={onEditNotes} />);

      const notesBtn = screen.getByTestId("btn-notes");
      await user.click(notesBtn);

      expect(onEditNotes).toHaveBeenCalledWith(1, null);
    });

    it("shows filled notes icon when notes exist", () => {
      const jobWithNotes = { ...mockJob, notes: "Important company" };
      renderWithToast(<JobCard job={jobWithNotes} onEditNotes={vi.fn()} />);

      const notesBtn = screen.getByTestId("btn-notes");
      expect(notesBtn).toHaveAttribute("aria-label", "Edit notes");
    });

    it("shows empty notes icon when no notes", () => {
      renderWithToast(<JobCard job={mockJob} onEditNotes={vi.fn()} />);

      const notesBtn = screen.getByTestId("btn-notes");
      expect(notesBtn).toHaveAttribute("aria-label", "Add notes");
    });
  });

  describe("hide button", () => {
    it("renders hide button when onHideJob is provided", () => {
      const onHideJob = vi.fn();
      renderWithToast(<JobCard job={mockJob} onHideJob={onHideJob} />);
      expect(screen.getByTestId("btn-hide")).toBeInTheDocument();
    });

    it("does not render hide button when onHideJob is not provided", () => {
      renderWithToast(<JobCard job={mockJob} />);
      expect(screen.queryByTestId("btn-hide")).not.toBeInTheDocument();
    });

    it("calls onHideJob with job id when clicked", async () => {
      const user = userEvent.setup();
      const onHideJob = vi.fn();
      renderWithToast(<JobCard job={mockJob} onHideJob={onHideJob} />);

      const hideBtn = screen.getByTestId("btn-hide");
      await user.click(hideBtn);

      expect(onHideJob).toHaveBeenCalledWith(1);
    });

    it("has correct aria-label", () => {
      renderWithToast(<JobCard job={mockJob} onHideJob={vi.fn()} />);
      const hideBtn = screen.getByTestId("btn-hide");
      expect(hideBtn).toHaveAttribute(
        "aria-label",
        "Not interested in this job",
      );
    });
  });

  describe("research company button", () => {
    it("renders research button when onResearchCompany is provided", () => {
      const onResearchCompany = vi.fn();
      renderWithToast(
        <JobCard job={mockJob} onResearchCompany={onResearchCompany} />,
      );
      expect(screen.getByTestId("btn-research")).toBeInTheDocument();
    });

    it("does not render research button when onResearchCompany is not provided", () => {
      renderWithToast(<JobCard job={mockJob} />);
      expect(screen.queryByTestId("btn-research")).not.toBeInTheDocument();
    });

    it("calls onResearchCompany with company name when clicked", async () => {
      const user = userEvent.setup();
      const onResearchCompany = vi.fn();
      renderWithToast(
        <JobCard job={mockJob} onResearchCompany={onResearchCompany} />,
      );

      const researchBtn = screen.getByTestId("btn-research");
      await user.click(researchBtn);

      expect(onResearchCompany).toHaveBeenCalledWith("CareBridge Services");
    });
  });

});
