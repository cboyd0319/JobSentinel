import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AnalyticsPanel } from "./AnalyticsPanel";

// Mock cachedInvoke
const mockCachedInvoke = vi.fn();
vi.mock("../utils/api", () => ({
  cachedInvoke: (...args: unknown[]) => mockCachedInvoke(...args),
}));

// Mock logError
vi.mock("../utils/errorUtils", () => ({
  logError: vi.fn(),
}));

// Mock recharts
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

describe("AnalyticsPanel", () => {
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
    ],
    avg_response_days: 7.5,
    company_response_times: [
      { company: "FastCorp", applications: 3, responses: 3, avg_days: 2 },
      { company: "SlowCo", applications: 2, responses: 1, avg_days: 21 },
      { company: "NoResponse Inc", applications: 5, responses: 0, avg_days: null },
    ],
  };

  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    mockCachedInvoke.mockResolvedValue(mockStats);

    // Mock localStorage
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(
      (key: string) => mockLocalStorage[key] || null
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(
      (key: string, value: string) => {
        mockLocalStorage[key] = value;
      }
    );
  });

  afterEach(() => {
    // Clear localStorage mock
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
    vi.restoreAllMocks();
  });

  describe("loading state", () => {
    it("shows loading skeleton initially", () => {
      mockCachedInvoke.mockImplementation(() => new Promise(() => {}));

      render(<AnalyticsPanel onClose={mockOnClose} />);

      expect(screen.getByRole("dialog", { name: /loading analytics/i })).toBeInTheDocument();
      expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
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
          screen.getByText("Could not load application summary. Please try again.")
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
        expect(screen.getByText("Application Analytics")).toBeInTheDocument();
      });
    });

    it("shows total applications metric", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("50")).toBeInTheDocument();
        expect(screen.getByText("Total Applications")).toBeInTheDocument();
      });
    });

    it("shows response rate metric", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("45.5%")).toBeInTheDocument();
        expect(screen.getByText("Response Rate")).toBeInTheDocument();
      });
    });

    it("shows offer rate metric", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("6.0%")).toBeInTheDocument();
        expect(screen.getByText("Offer Rate")).toBeInTheDocument();
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
        expect(screen.getByText("Status Distribution")).toBeInTheDocument();
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
        expect(screen.getByText("Responses by Job Source")).toBeInTheDocument();
        expect(screen.queryByText("Performance by Job Source")).not.toBeInTheDocument();
      });
    });

    it("displays source names with proper labels", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("LinkedIn")).toBeInTheDocument();
        expect(screen.getByText("Greenhouse")).toBeInTheDocument();
      });
    });

    it("renders average response time", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Average Response Time")).toBeInTheDocument();
        expect(screen.getByText("7.5")).toBeInTheDocument();
      });
    });

    it("renders company response times", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Company Response Times")).toBeInTheDocument();
        // FastCorp may appear in multiple lists, use getAllByText
        expect(screen.getAllByText("FastCorp").length).toBeGreaterThan(0);
        expect(screen.getAllByText("SlowCo").length).toBeGreaterThan(0);
      });
    });

    it("renders detailed status breakdown", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Detailed Status Breakdown")).toBeInTheDocument();
        expect(screen.getByText("Applied")).toBeInTheDocument();
        expect(screen.getByText("Rejected")).toBeInTheDocument();
      });
    });
  });

  describe("close functionality", () => {
    it("calls onClose when close button is clicked", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close analytics/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /close analytics/i }));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onClose when Escape key is pressed", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Application Analytics")).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: "Escape" });
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onClose when clicking overlay", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Application Analytics")).toBeInTheDocument();
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
        expect(screen.getByText("Application Analytics")).toBeInTheDocument();
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
          screen.getByText("Set a weekly plan to pace your applications")
        ).toBeInTheDocument();
      });
    });

    it("ignores malformed stored weekly goals", async () => {
      mockLocalStorage.jobsentinel_weekly_goals = JSON.stringify({
        target: "20",
        weekStart: new Date().toISOString(),
      });

      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(
          screen.getByText("Set a weekly plan to pace your applications")
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
          screen.queryByText("Weekly Applications (Last 12 Weeks)")
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
        expect(screen.queryByText("Responses by Job Source")).not.toBeInTheDocument();
      });
    });

    it("hides response time when zero", async () => {
      mockCachedInvoke.mockResolvedValue({
        ...mockStats,
        avg_response_days: 0,
      });

      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.queryByText("Average Response Time")).not.toBeInTheDocument();
      });
    });
  });

  describe("company response times", () => {
    it("shows fastest responders section", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Fastest Responders")).toBeInTheDocument();
      });
    });

    it("shows slowest responders section", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Slowest Responders")).toBeInTheDocument();
      });
    });

    it("shows awaiting response section", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/awaiting response/i)).toBeInTheDocument();
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
        expect(screen.getByRole("dialog")).toHaveAttribute(
          "aria-labelledby",
          "analytics-title"
        );
      });
    });

    it("close button has aria-label", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /close analytics/i })
        ).toBeInTheDocument();
      });
    });
  });
});
