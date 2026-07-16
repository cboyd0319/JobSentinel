import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AnalyticsPanel } from "./AnalyticsPanel";

// Mock cachedInvoke
const mockCachedInvoke = vi.fn();
vi.mock("../../platform/tauri", () => ({
  cachedInvoke: (...args: unknown[]) => mockCachedInvoke(...args),
}));

// Mock logError
vi.mock("../../shared/errorReporting/logger", () => ({
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

  describe("loading state", () => {
    it("shows loading skeleton initially", () => {
      mockCachedInvoke.mockImplementation(() => new Promise(() => {}));

      render(<AnalyticsPanel onClose={mockOnClose} />);

      expect(screen.getByRole("dialog", { name: /application summary/i })).toBeInTheDocument();
      expect(screen.getByRole("status", { name: /loading application summary/i })).toBeInTheDocument();
      expect(document.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
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
          screen.getByText(
            "Could not load application summary. Try again, or copy a safe support report if this keeps happening.",
          )
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
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });
    });

    it("shows total applications metric", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("50")).toBeInTheDocument();
        expect(screen.getByText("Total Applications")).toBeInTheDocument();
      });
    });

    it("shows employer replies metric", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("45.5%")).toBeInTheDocument();
        expect(screen.getByText("Employer replies")).toBeInTheDocument();
      });
    });

    it("shows offers received metric", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("6.0%")).toBeInTheDocument();
        expect(screen.getByText("Offers received")).toBeInTheDocument();
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
        expect(screen.getByText("Application Status")).toBeInTheDocument();
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
        expect(screen.getByText("Replies by Job Source")).toBeInTheDocument();
        expect(screen.queryByText("Performance by Job Source")).not.toBeInTheDocument();
      });
    });

    it("displays source names with proper labels", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("LinkedIn job board")).toBeInTheDocument();
        expect(screen.getByText("Greenhouse hiring page")).toBeInTheDocument();
        expect(screen.getByText("Connected job source")).toBeInTheDocument();
        expect(screen.queryByText("JobsWithGPT")).not.toBeInTheDocument();
      });
    });

    it("renders average response time", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Average Reply Time")).toBeInTheDocument();
        expect(screen.getByText("7.5")).toBeInTheDocument();
      });
    });

    it("renders company response times", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Employer Reply Times")).toBeInTheDocument();
        // FastCorp may appear in multiple lists, use getAllByText
        expect(screen.getAllByText("FastCorp").length).toBeGreaterThan(0);
        expect(screen.getAllByText("SlowCo").length).toBeGreaterThan(0);
      });
    });

    it("renders detailed status breakdown", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Status Details")).toBeInTheDocument();
        expect(screen.getByText("Applied")).toBeInTheDocument();
        expect(screen.getByText("Not Selected")).toBeInTheDocument();
      });
    });
  });

  describe("close functionality", () => {
    it("calls onClose when close button is clicked", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close application summary/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /close application summary/i }));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onClose when Escape key is pressed", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onClose when clicking overlay", async () => {
      render(<AnalyticsPanel onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
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
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
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

});
