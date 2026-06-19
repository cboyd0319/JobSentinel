import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApplicationsReviewPanel } from "./ApplicationsReviewPanel";
import type { ApplicationReviewSummary } from "./applicationsModel";

const summary: ApplicationReviewSummary = {
  title: "Do these first",
  description: "Start with the highest priority work.",
  actions: [
    {
      kind: "reminders",
      priority: "high",
      count: 2,
      title: "Finish reminders",
      description: "2 follow-ups, prep items, or deadlines are waiting.",
    },
    {
      kind: "interviews",
      priority: "medium",
      count: 1,
      title: "Prepare for interviews",
      description: "1 conversation needs prep or follow-up.",
    },
    {
      kind: "to_apply",
      priority: "low",
      count: 3,
      title: "Apply or skip saved roles",
      description: "3 saved roles need a decision.",
      handoff: {
        label: "Posting review",
        description: "Review source, pay, and must-haves, then tailor only if the role is worth applying to.",
      },
    },
    {
      kind: "weekly_review",
      priority: "low",
      count: 0,
      title: "Replan this week",
      description: "Compare sources and quiet roles before changing pace.",
      handoff: {
        label: "Job-search plan",
        description: "Replan lanes, sources, pacing, and stop rules from tracker evidence.",
      },
    },
  ],
};

describe("ApplicationsReviewPanel", () => {
  it("renders next actions and routes buttons to existing workflow surfaces", () => {
    const handlers = {
      onReviewReminders: vi.fn(),
      onReviewNoResponses: vi.fn(),
      onOpenInterviews: vi.fn(),
      onOpenSummary: vi.fn(),
      onReviewSavedRoles: vi.fn(),
      onGoToJobs: vi.fn(),
      onImportJob: vi.fn(),
    };

    render(<ApplicationsReviewPanel summary={summary} {...handlers} />);

    expect(screen.getByText("Search review")).toBeInTheDocument();
    expect(screen.getByText("Finish reminders")).toBeInTheDocument();
    expect(screen.getByText("Prepare for interviews")).toBeInTheDocument();
    expect(screen.getByText("Apply or skip saved roles")).toBeInTheDocument();
    expect(screen.getByText("After this: Posting review")).toBeInTheDocument();
    expect(screen.getByText("After this: Job-search plan")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Review reminders" }));
    fireEvent.click(screen.getByRole("button", { name: "Open interviews" }));
    fireEvent.click(screen.getByRole("button", { name: "Review saved roles" }));
    fireEvent.click(screen.getByRole("button", { name: "Review weekly plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Summary" }));

    expect(handlers.onReviewReminders).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenInterviews).toHaveBeenCalledTimes(1);
    expect(handlers.onReviewSavedRoles).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenSummary).toHaveBeenCalledTimes(2);
  });

  it("falls back to Jobs when import is not available", () => {
    const onGoToJobs = vi.fn();

    render(
      <ApplicationsReviewPanel
        summary={{
          ...summary,
          actions: [
            {
              kind: "to_apply",
              priority: "low",
              count: 0,
              title: "Add a job to track",
              description: "Start with one saved, pasted, or imported job.",
            },
          ],
        }}
        onReviewReminders={vi.fn()}
        onReviewNoResponses={vi.fn()}
        onOpenInterviews={vi.fn()}
        onOpenSummary={vi.fn()}
        onReviewSavedRoles={vi.fn()}
        onGoToJobs={onGoToJobs}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add or import job" }));

    expect(onGoToJobs).toHaveBeenCalledTimes(1);
  });
});
