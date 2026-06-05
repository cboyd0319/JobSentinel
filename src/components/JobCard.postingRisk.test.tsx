import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { JobCard } from "./JobCard";
import * as deeplinks from "../services/deeplinks";
import { ToastProvider } from "../contexts/ToastContext";

vi.mock("../services/deeplinks", () => ({
  openDeepLink: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const { invoke } = await import("@tauri-apps/api/core");
const mockInvoke = vi.mocked(invoke);

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

describe("JobCard posting risk guidance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });

  it("shows separate possible scam guidance for money or check requests", () => {
    const scamRiskJob = {
      ...mockJob,
      description:
        "We will send you a cashier's check for equipment. Deposit the check and send the remaining funds to our vendor.",
      ghost_score: 0.2,
    };

    renderWithToast(<JobCard job={scamRiskJob} />);

    expect(screen.getByTestId("scam-risk-guidance")).toHaveTextContent(
      "Possible scam sign",
    );
    expect(screen.getByText(/do not pay fees/i)).toBeInTheDocument();
    expect(screen.queryByTestId("posting-risk-guidance")).not.toBeInTheDocument();
    expect(
      screen.getByRole("article", {
        name: /possible scam sign/i,
      }),
    ).toBeInTheDocument();
  });

  it("keeps ordinary job descriptions quiet for scam guidance", () => {
    renderWithToast(<JobCard job={mockJob} />);

    expect(screen.queryByTestId("scam-risk-guidance")).not.toBeInTheDocument();
  });

  it("shows verify-before-tailoring guidance for high posting risk", () => {
    const highRiskJob = { ...mockJob, ghost_score: 0.82 };

    renderWithToast(<JobCard job={highRiskJob} />);

    expect(screen.getByTestId("posting-risk-guidance")).toHaveTextContent(
      "Verify before tailoring",
    );
    expect(
      screen.getByText(/open the original job page before spending serious time/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("article", {
        name: /verify before tailoring/i,
      }),
    ).toBeInTheDocument();
  });

  it("opens the original posting from high posting-risk guidance", async () => {
    const user = userEvent.setup();
    const onViewJob = vi.fn();
    const highRiskJob = { ...mockJob, ghost_score: 0.82 };

    renderWithToast(<JobCard job={highRiskJob} onViewJob={onViewJob} />);

    expect(
      screen.getByText(/check that the original posting is still active/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /open original posting before tailoring/i,
      }),
    );

    expect(onViewJob).toHaveBeenCalledWith("https://example.com/job/1");
    expect(deeplinks.openDeepLink).not.toHaveBeenCalled();
  });

  it("uses the safe link opener from high posting-risk guidance", async () => {
    const user = userEvent.setup();
    vi.mocked(deeplinks.openDeepLink).mockResolvedValue();
    const highRiskJob = { ...mockJob, ghost_score: 0.82 };

    renderWithToast(<JobCard job={highRiskJob} />);

    await user.click(
      screen.getByRole("button", {
        name: /open original posting before tailoring/i,
      }),
    );

    expect(deeplinks.openDeepLink).toHaveBeenCalledWith(
      "https://example.com/job/1",
    );
  });

  it("blocks unsafe links from high posting-risk guidance", async () => {
    const user = userEvent.setup();
    const highRiskJob = {
      ...mockJob,
      ghost_score: 0.82,
      url: "javascript:alert(1)",
    };

    renderWithToast(<JobCard job={highRiskJob} />);

    await user.click(
      screen.getByRole("button", {
        name: /open original posting before tailoring/i,
      }),
    );

    expect(screen.getByTestId("job-link-guidance")).toHaveTextContent("Check job link");
    expect(
      await screen.findByText("This saved link does not look safe to open."),
    ).toBeInTheDocument();
    expect(deeplinks.openDeepLink).not.toHaveBeenCalled();
  });

  it("blocks unsafe links before calling custom high-risk opener", async () => {
    const user = userEvent.setup();
    const onViewJob = vi.fn();
    const highRiskJob = {
      ...mockJob,
      ghost_score: 0.82,
      url: "javascript:alert(1)",
    };

    renderWithToast(<JobCard job={highRiskJob} onViewJob={onViewJob} />);

    await user.click(
      screen.getByRole("button", {
        name: /open original posting before tailoring/i,
      }),
    );

    expect(
      await screen.findByText("This saved link does not look safe to open."),
    ).toBeInTheDocument();
    expect(onViewJob).not.toHaveBeenCalled();
    expect(deeplinks.openDeepLink).not.toHaveBeenCalled();
  });

  it("shows lighter review guidance for medium posting risk", () => {
    const mediumRiskJob = { ...mockJob, ghost_score: 0.67 };

    renderWithToast(<JobCard job={mediumRiskJob} />);

    expect(screen.getByTestId("posting-risk-guidance")).toHaveTextContent(
      "Review before tailoring",
    );
    expect(
      screen.getByText(/quick original-posting check can protect your time/i),
    ).toBeInTheDocument();
  });

  it("keeps lower posting-risk jobs visually quiet", () => {
    const lowerRiskJob = { ...mockJob, ghost_score: 0.52 };

    renderWithToast(<JobCard job={lowerRiskJob} />);

    expect(screen.queryByTestId("posting-risk-guidance")).not.toBeInTheDocument();
  });

  it("treats out-of-range posting-risk scores as unavailable", () => {
    const invalidRiskJob = { ...mockJob, ghost_score: 1.5 };

    renderWithToast(<JobCard job={invalidRiskJob} />);

    expect(screen.queryByTestId("posting-risk-guidance")).not.toBeInTheDocument();
    expect(screen.queryByText("Posting may need review")).not.toBeInTheDocument();
    expect(screen.queryByText("Verify before tailoring")).not.toBeInTheDocument();
  });

  it("keeps parsed stale evidence when posting-risk score is invalid", () => {
    const staleReasonJob = {
      ...mockJob,
      ghost_score: Infinity,
      ghost_reasons: JSON.stringify([
        {
          category: "stale",
          description: "Posted 70 days ago",
          weight: 0.2,
          severity: "medium",
        },
      ]),
    };

    renderWithToast(<JobCard job={staleReasonJob} />);

    expect(screen.getByTestId("posting-risk-guidance")).toHaveTextContent(
      "Check posting evidence",
    );
    expect(screen.queryByText("Posting may need review")).not.toBeInTheDocument();
    expect(screen.queryByText("Verify before tailoring")).not.toBeInTheDocument();
  });

  it("shows stale or repost evidence even below the badge threshold", () => {
    const lowScoreStaleJob = {
      ...mockJob,
      ghost_score: 0.42,
      ghost_reasons: JSON.stringify([
        {
          category: "stale",
          description: "Posted more than 90 days ago",
          weight: 0.2,
          severity: "low",
        },
      ]),
    };

    renderWithToast(<JobCard job={lowScoreStaleJob} />);

    expect(screen.getByTestId("posting-risk-guidance")).toHaveTextContent(
      "Check posting evidence",
    );
    expect(
      screen.getByText(/open the original job page before spending tailoring time/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("article", {
        name: /posting evidence to check/i,
      }),
    ).toBeInTheDocument();
  });

  it("shows stale or repost evidence even when score is unavailable", () => {
    const unscoredStaleJob = {
      ...mockJob,
      ghost_score: null,
      ghost_reasons: JSON.stringify([
        {
          category: "repost",
          description: "Seen several times for the same role",
          weight: 0.2,
          severity: "low",
        },
      ]),
    };

    renderWithToast(<JobCard job={unscoredStaleJob} />);

    expect(screen.getByTestId("posting-risk-guidance")).toHaveTextContent(
      "Check posting evidence",
    );
    expect(
      screen.getByText(/open the original job page before spending tailoring time/i),
    ).toBeInTheDocument();
  });

  it("ignores malformed low-score posting-risk reasons", () => {
    const malformedReasonJob = {
      ...mockJob,
      ghost_score: 0.42,
      ghost_reasons: JSON.stringify([
        {
          category: "stale",
          description: "missing severity and weight",
        },
      ]),
    };

    renderWithToast(<JobCard job={malformedReasonJob} />);

    expect(screen.queryByTestId("posting-risk-guidance")).not.toBeInTheDocument();
  });

  it("shows low-detail role guidance for broad titles and thin descriptions", () => {
    const lowDetailJob = {
      ...mockJob,
      title: "Various Positions",
      description: "Great opportunity.",
      ghost_score: null,
      ghost_reasons: null,
    };

    renderWithToast(<JobCard job={lowDetailJob} />);

    expect(screen.getByTestId("posting-risk-guidance")).toHaveTextContent(
      "Check role details",
    );
    expect(
      screen.getByText(/confirm the role, team, and work details before tailoring/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("article", {
        name: /role details to check/i,
      }),
    ).toBeInTheDocument();
  });

  it("keeps stronger posting-risk guidance ahead of low-detail cues", () => {
    const highRiskLowDetailJob = {
      ...mockJob,
      title: "Various Positions",
      description: "Great opportunity.",
      ghost_score: 0.82,
    };

    renderWithToast(<JobCard job={highRiskLowDetailJob} />);

    expect(screen.getByTestId("posting-risk-guidance")).toHaveTextContent(
      "Verify before tailoring",
    );
    expect(screen.queryByText("Check role details")).not.toBeInTheDocument();
  });
});
