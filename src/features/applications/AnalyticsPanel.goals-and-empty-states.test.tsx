import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AnalyticsPanel } from "./AnalyticsPanel";

const mockCachedInvoke = vi.fn();
vi.mock("../../platform/tauri", () => ({
  cachedInvoke: (...args: unknown[]) => mockCachedInvoke(...args),
}));

vi.mock("../../shared/errorReporting/logger", () => ({
  logError: vi.fn(),
}));

vi.mock("recharts/es6/chart/BarChart", () => ({
  BarChart: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
}));
vi.mock("recharts/es6/cartesian/Bar", () => ({
  Bar: () => <div data-testid="bar" />,
}));
vi.mock("recharts/es6/cartesian/XAxis", () => ({
  XAxis: () => <div data-testid="x-axis" />,
}));
vi.mock("recharts/es6/cartesian/YAxis", () => ({
  YAxis: () => <div data-testid="y-axis" />,
}));
vi.mock("recharts/es6/cartesian/CartesianGrid", () => ({
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
}));
vi.mock("recharts/es6/component/Tooltip", () => ({
  Tooltip: () => <div data-testid="tooltip" />,
}));
vi.mock("recharts/es6/component/ResponsiveContainer", () => ({
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));
vi.mock("recharts/es6/chart/PieChart", () => ({
  PieChart: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
}));
vi.mock("recharts/es6/polar/Pie", () => ({
  Pie: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
}));
vi.mock("recharts/es6/component/Cell", () => ({
  Cell: () => <div data-testid="cell" />,
}));
vi.mock("recharts/es6/component/Legend", () => ({
  Legend: () => <div data-testid="legend" />,
}));

describe("AnalyticsPanel goals and empty states", () => {
  const mockOnClose = vi.fn();

  const mockStats = {
    total: 50,
    by_status: {
      to_apply: 10,
      applied: 15,
      screening_call: 5,
      phone_interview: 3,
      technical_interview: 2,
      onsite_interview: 1,
      offer_received: 2,
      offer_accepted: 1,
      offer_rejected: 0,
      rejected: 8,
      ghosted: 3,
      withdrawn: 0,
    },
    response_rate: 45.5,
    offer_rate: 6.0,
    weekly_applications: [
      { week: "2024-01", count: 12 },
      { week: "2024-02", count: 18 },
      { week: "2024-03", count: 20 },
    ],
    by_source: [
      { source: "linkedin", count: 25, response_rate: 40 },
      { source: "greenhouse", count: 15, response_rate: 55 },
      { source: "jobswithgpt", count: 4, response_rate: 25 },
    ],
    avg_response_days: 7.5,
    company_response_times: [
      { company: "FastCorp", applications: 3, responses: 3, avg_days: 2 },
      { company: "SlowCo", applications: 2, responses: 1, avg_days: 21 },
      { company: "NoResponse Inc", applications: 5, responses: 0, avg_days: null },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockCachedInvoke.mockResolvedValue(mockStats);
  });

  afterEach(() => {
    window.localStorage.clear();
  });

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
