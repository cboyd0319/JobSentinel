import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { DashboardWidgets } from "./DashboardWidgets";
import {
  mockAppStats,
  mockJobsBySource,
  mockSalaryRanges,
} from "./DashboardWidgets.testData";

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock recharts - simplified rendering
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ data }: { data: unknown[] }) => (
    <div data-testid="bar-chart">{JSON.stringify(data)}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  PieChart: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children, data }: { children?: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="pie">
      {data ? JSON.stringify(data) : null}
      {children}
    </div>
  ),
  Cell: () => <div data-testid="cell" />,
  Legend: () => <div data-testid="legend" />,
  AreaChart: ({ data }: { data: unknown[] }) => (
    <div data-testid="area-chart">{JSON.stringify(data)}</div>
  ),
  Area: () => <div data-testid="area" />,
  FunnelChart: () => <div data-testid="funnel-chart" />,
  Funnel: () => <div data-testid="funnel" />,
  LabelList: () => <div data-testid="label-list" />,
}));

// Mock logError
vi.mock("../../../shared/errorReporting/logger", () => ({
  logError: vi.fn(),
}));

describe("DashboardWidgets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // Ensure real timers are used
    mockInvoke.mockImplementation((command: string) => {
      switch (command) {
        case "get_application_stats":
          return Promise.resolve(mockAppStats);
        case "get_jobs_by_source":
          return Promise.resolve(mockJobsBySource);
        case "get_salary_distribution":
          return Promise.resolve(mockSalaryRanges);
        default:
          return Promise.reject(new Error(`Unknown command: ${command}`));
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("loading state", () => {
    it("shows loading spinner initially", async () => {
      vi.useFakeTimers();
      // Delay the promise resolution
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      render(<DashboardWidgets />);

      // Advance past the spinner delay (LoadingSpinner has 250ms delay)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      // Should show loading spinner (motion-safe prefix for accessibility)
      expect(document.querySelector(".motion-safe\\:animate-spin")).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe("toggle button", () => {
    it("renders toggle button with title", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });
    });

    it("shows total applications in header", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("50 applications")).toBeInTheDocument();
      });
    });

    it("shows employer replies in header", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("40% employer replies")).toBeInTheDocument();
      });
    });

    it("has aria-expanded false initially", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        const button = screen.getByRole("button", {
          name: /Application Summary/i,
        });
        expect(button).toHaveAttribute("aria-expanded", "false");
      });
    });

    it("toggles aria-expanded on click", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      const button = screen.getByRole("button", {
        name: /Application Summary/i,
      });

      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");

      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("expanded content", () => {
    it("does not show charts initially", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      expect(screen.queryByText("Application Progress")).not.toBeInTheDocument();
    });

    it("shows charts when expanded", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Application Summary"));

      expect(screen.getByText("Application Progress")).toBeInTheDocument();
      expect(screen.queryByText("Application Funnel")).not.toBeInTheDocument();
      expect(screen.getByText("Weekly Applications")).toBeInTheDocument();
      expect(screen.getByText("Where Jobs Came From")).toBeInTheDocument();
      expect(screen.getByText(/Connected job source/)).toBeInTheDocument();
      expect(screen.queryByText(/jobswithgpt/)).not.toBeInTheDocument();
      expect(screen.getByText("Pay Ranges Found")).toBeInTheDocument();
    });

    it("renders charts region with aria-label", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Application Summary"));

      expect(
        screen.getByRole("region", { name: "Application summary charts" })
      ).toBeInTheDocument();
    });

    it("shows At a Glance section", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Application Summary"));

      expect(screen.getByText("At a Glance")).toBeInTheDocument();
    });
  });

  describe("quick stats", () => {
    it("shows employer replies stat", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Application Summary"));

      expect(screen.getByText("Employer replies")).toBeInTheDocument();
      expect(screen.getByText("40%")).toBeInTheDocument();
    });

    it("shows offers received stat", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Application Summary"));

      expect(screen.getByText("Offers received")).toBeInTheDocument();
      expect(screen.getByText("10%")).toBeInTheDocument();
    });

    it("shows active applications stat", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Application Summary"));

      expect(screen.getByText("Active")).toBeInTheDocument();
      // 20 applied + 5 screening + 3 phone + 2 technical + 1 onsite = 31
      expect(screen.getByText("31")).toBeInTheDocument();
    });

    it("shows no-response stat", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Application Summary"));

      expect(screen.getByText("No Response")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  describe("funnel data", () => {
    it("shows funnel legend items", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Application Summary"));

      // Funnel shows stages with counts
      expect(screen.getByText(/Applied: 20/)).toBeInTheDocument();
      expect(screen.getByText(/Screening: 5/)).toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("handles app stats error gracefully", async () => {
      mockInvoke.mockRejectedValue(new Error("Network error"));

      render(<DashboardWidgets />);

      // Should finish loading even on error
      await waitFor(() => {
        expect(document.querySelector(".animate-spin")).not.toBeInTheDocument();
      });
      expect(screen.getByText("Could not load application summary. Try again, or copy a safe support report if this keeps happening.")).toBeInTheDocument();
      expect(screen.queryByText("Failed to load analytics data")).not.toBeInTheDocument();
    });

    it("handles jobs by source error gracefully", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_stats") {
          return Promise.resolve(mockAppStats);
        }
        if (command === "get_jobs_by_source") {
          return Promise.reject(new Error("Source error"));
        }
        if (command === "get_salary_distribution") {
          return Promise.resolve(mockSalaryRanges);
        }
        return Promise.reject(new Error("Unknown"));
      });

      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      // Should still work, just won't show jobs by source chart
      fireEvent.click(screen.getByText("Application Summary"));

      expect(screen.getByText("At a Glance")).toBeInTheDocument();
    });

    it("handles undefined optional analytics data gracefully", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_stats") {
          return Promise.resolve(mockAppStats);
        }
        return Promise.resolve(undefined);
      });

      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Application Summary"));

      expect(screen.getByText("At a Glance")).toBeInTheDocument();
      expect(screen.queryByText("Where Jobs Came From")).not.toBeInTheDocument();
      expect(screen.queryByText("Pay Ranges Found")).not.toBeInTheDocument();
    });
  });

  describe("empty data states", () => {
    it("hides funnel chart when no funnel data", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_stats") {
          return Promise.resolve({
            ...mockAppStats,
            by_status: {
              ...mockAppStats.by_status,
              applied: 0,
              screening_call: 0,
              phone_interview: 0,
              technical_interview: 0,
              onsite_interview: 0,
              offer_received: 0,
            },
          });
        }
        return Promise.resolve([]);
      });

      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Application Summary"));

      expect(screen.queryByText("Application Progress")).not.toBeInTheDocument();
    });

    it("hides source chart when no source data", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_stats") {
          return Promise.resolve(mockAppStats);
        }
        return Promise.resolve([]);
      });

      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Application Summary"));

      expect(screen.queryByText("Where Jobs Came From")).not.toBeInTheDocument();
    });

    it("hides salary chart when no salary data", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_stats") {
          return Promise.resolve(mockAppStats);
        }
        if (command === "get_jobs_by_source") {
          return Promise.resolve(mockJobsBySource);
        }
        return Promise.resolve([]);
      });

      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Application Summary"));

      expect(screen.queryByText("Pay Ranges Found")).not.toBeInTheDocument();
    });
  });

  describe("className prop", () => {
    it("applies custom className", async () => {
      const { container } = render(
        <DashboardWidgets className="custom-class" />
      );

      await waitFor(() => {
        expect(screen.getByText("Application Summary")).toBeInTheDocument();
      });

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("stat box colors", () => {
    it("keeps high employer-reply percentage visually neutral", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_stats") {
          return Promise.resolve({ ...mockAppStats, response_rate: 50 });
        }
        return Promise.resolve([]);
      });

      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("50% employer replies")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Application Summary"));

      const responseRateBox = screen.getByText("Employer replies").closest("div");
      expect(responseRateBox?.className).toContain("bg-surface-50");
    });

    it("keeps medium employer-reply percentage visually neutral", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_stats") {
          return Promise.resolve({ ...mockAppStats, response_rate: 20 });
        }
        return Promise.resolve([]);
      });

      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("20% employer replies")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Application Summary"));

      const responseRateBox = screen.getByText("Employer replies").closest("div");
      expect(responseRateBox?.className).toContain("bg-surface-50");
    });

    it("keeps low employer-reply percentage visually neutral", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_stats") {
          return Promise.resolve({ ...mockAppStats, response_rate: 10 });
        }
        return Promise.resolve([]);
      });

      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("10% employer replies")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Application Summary"));

      const responseRateBox = screen.getByText("Employer replies").closest("div");
      expect(responseRateBox?.className).toContain("bg-surface-50");
    });
  });
});
