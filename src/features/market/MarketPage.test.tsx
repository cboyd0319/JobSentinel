import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MarketPage from "./MarketPage";
import { getMarketDataErrorCopy } from "./errorCopy";

const mockInvoke = vi.mocked(invoke);

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock("../../shared/toast/useToast", () => ({
  useToast: () => mockToast,
}));

function makeSnapshot(overrides: Partial<{
  date: string;
  total_jobs: number;
  new_jobs_today: number;
  jobs_filled_today: number;
  avg_salary: number | null;
  median_salary: number | null;
  remote_job_percentage: number;
  top_skill: string | null;
  top_company: string | null;
  top_location: string | null;
  total_companies_hiring: number;
  market_sentiment: string;
}> = {}) {
  return {
    date: "2026-06-06",
    total_jobs: 0,
    new_jobs_today: 0,
    jobs_filled_today: 0,
    avg_salary: null,
    median_salary: null,
    remote_job_percentage: 0,
    top_skill: null,
    top_company: null,
    top_location: null,
    total_companies_hiring: 0,
    market_sentiment: "neutral",
    ...overrides,
  };
}

function mockMarketData({
  skills = [],
  companies = [],
  locations = [],
  alerts = [],
  snapshot = makeSnapshot(),
}: {
  skills?: unknown[];
  companies?: unknown[];
  locations?: unknown[];
  alerts?: unknown[];
  snapshot?: unknown;
}) {
  mockInvoke.mockImplementation(async (command: string) => {
    if (command === "get_trending_skills") return skills;
    if (command === "get_active_companies") return companies;
    if (command === "get_hottest_locations") return locations;
    if (command === "get_market_alerts") return alerts;
    if (command === "get_market_snapshot") return snapshot;
    if (command === "run_market_analysis") return null;
    return null;
  });
}

describe("Market safe error copy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });

  it("does not expose raw private details in market load errors", () => {
    const copy = getMarketDataErrorCopy(
      new Error("token=raw-secret private@example.test resume=private-file"),
    );
    const visibleText = `${copy.inlineMessage} ${copy.toastTitle} ${copy.toastMessage}`;

    expect(copy.toastTitle).toBe("Hiring trends unavailable");
    expect(visibleText).toContain("safe support report");
    expect(visibleText).not.toMatch(/raw-secret|private@example\.test|resume=private-file/);
  });

  it("shows no-input guidance after refreshing with no local job data", async () => {
    const user = userEvent.setup();
    mockMarketData({ snapshot: makeSnapshot() });

    render(<MarketPage onBack={vi.fn()} />);

    await screen.findByText("Hiring Trends");
    await user.click(screen.getByRole("button", { name: /refresh hiring trends/i }));

    await waitFor(() => {
      expect(mockToast.info).toHaveBeenCalledWith(
        "No job data yet",
        "Turn on job sources or import jobs, then refresh trends again.",
      );
    });
    expect(
      screen.getAllByText("Turn on job sources or import job postings to build trends.").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Refresh hiring trends to see skill trends")).not.toBeInTheDocument();
  });

  it("does not tell users to import jobs when only the snapshot is missing", async () => {
    mockMarketData({
      skills: [
        {
          skill_name: "Security",
          total_jobs: 4,
          avg_salary: null,
          change_percent: 0,
          trend_direction: "flat",
        },
      ],
      snapshot: null,
    });

    render(<MarketPage onBack={vi.fn()} />);

    expect(
      await screen.findByText("Trend snapshot is not ready yet. Other trend signals are available below."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Turn on job sources or import job postings to build trends."),
    ).not.toBeInTheDocument();
  });

  it("links active tab to panel and supports arrow-key tab navigation", async () => {
    const user = userEvent.setup();
    mockMarketData({ snapshot: makeSnapshot({ total_jobs: 3 }) });

    render(<MarketPage onBack={vi.fn()} />);

    const overviewTab = await screen.findByRole("tab", { name: /overview/i });
    const skillsTab = screen.getByRole("tab", { name: /skills/i });
    expect(overviewTab).toHaveAttribute("aria-controls", "overview-panel");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("id", "overview-panel");

    overviewTab.focus();
    await user.keyboard("{ArrowRight}");

    await waitFor(() => {
      expect(skillsTab).toHaveFocus();
      expect(skillsTab).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tabpanel")).toHaveAttribute("id", "skills-panel");
    });
  });
});
