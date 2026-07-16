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

});
