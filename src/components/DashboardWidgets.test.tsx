import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DashboardWidgets } from "./DashboardWidgets";

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
  PieChart: () => <div data-testid="pie-chart" />,
  Pie: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="pie">{children}</div>
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
vi.mock("../utils/errorUtils", () => ({
  logError: vi.fn(),
}));

describe("DashboardWidgets", () => {
  const mockAppStats = {
    total: 50,
    by_status: {
      to_apply: 10,
      applied: 20,
      screening_call: 5,
      phone_interview: 3,
      technical_interview: 2,
      onsite_interview: 1,
      offer_received: 2,
      offer_accepted: 1,
      offer_rejected: 0,
      rejected: 4,
      ghosted: 2,
      withdrawn: 0,
    },
    response_rate: 0.4,
    offer_rate: 0.1,
    weekly_applications: [
      { week: "Week 1", count: 10 },
      { week: "Week 2", count: 15 },
      { week: "Week 3", count: 12 },
    ],
  };

  const mockJobsBySource = [
    { source: "linkedin", count: 30 },
    { source: "indeed", count: 15 },
    { source: "greenhouse", count: 5 },
  ];

  const mockSalaryRanges = [
    { range: "$50k-75k", count: 5 },
    { range: "$75k-100k", count: 15 },
    { range: "$100k-125k", count: 20 },
    { range: "$125k-150k", count: 8 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
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

  describe("loading state", () => {
    it("shows loading spinner initially", () => {
      // Delay the promise resolution
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      render(<DashboardWidgets />);

      // Should show loading spinner
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });

  describe("toggle button", () => {
    it("renders toggle button with title", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });
    });

    it("shows total applications in header", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("50 applications")).toBeInTheDocument();
      });
    });

    it("shows response rate in header", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("40% response rate")).toBeInTheDocument();
      });
    });

    it("has aria-expanded false initially", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        const button = screen.getByRole("button", {
          name: /Analytics Dashboard/i,
        });
        expect(button).toHaveAttribute("aria-expanded", "false");
      });
    });

    it("toggles aria-expanded on click", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });

      const button = screen.getByRole("button", {
        name: /Analytics Dashboard/i,
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
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });

      expect(screen.queryByText("Application Funnel")).not.toBeInTheDocument();
    });

    it("shows charts when expanded", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Analytics Dashboard"));

      expect(screen.getByText("Application Funnel")).toBeInTheDocument();
      expect(screen.getByText("Weekly Activity")).toBeInTheDocument();
      expect(screen.getByText("Jobs by Source")).toBeInTheDocument();
      expect(screen.getByText("Salary Distribution")).toBeInTheDocument();
    });

    it("renders charts region with aria-label", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Analytics Dashboard"));

      expect(
        screen.getByRole("region", { name: "Analytics charts" })
      ).toBeInTheDocument();
    });

    it("shows Quick Stats section", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Analytics Dashboard"));

      expect(screen.getByText("Quick Stats")).toBeInTheDocument();
    });
  });

  describe("quick stats", () => {
    it("shows response rate stat", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Analytics Dashboard"));

      expect(screen.getByText("Response Rate")).toBeInTheDocument();
      expect(screen.getByText("40%")).toBeInTheDocument();
    });

    it("shows offer rate stat", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Analytics Dashboard"));

      expect(screen.getByText("Offer Rate")).toBeInTheDocument();
      expect(screen.getByText("10%")).toBeInTheDocument();
    });

    it("shows active applications stat", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Analytics Dashboard"));

      expect(screen.getByText("Active")).toBeInTheDocument();
      // 20 applied + 5 screening + 3 phone + 2 technical + 1 onsite = 31
      expect(screen.getByText("31")).toBeInTheDocument();
    });

    it("shows ghosted stat", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Analytics Dashboard"));

      expect(screen.getByText("Ghosted")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  describe("funnel data", () => {
    it("shows funnel legend items", async () => {
      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Analytics Dashboard"));

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
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });

      // Should still work, just won't show jobs by source chart
      fireEvent.click(screen.getByText("Analytics Dashboard"));

      expect(screen.getByText("Quick Stats")).toBeInTheDocument();
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
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Analytics Dashboard"));

      expect(screen.queryByText("Application Funnel")).not.toBeInTheDocument();
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
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Analytics Dashboard"));

      expect(screen.queryByText("Jobs by Source")).not.toBeInTheDocument();
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
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Analytics Dashboard"));

      expect(screen.queryByText("Salary Distribution")).not.toBeInTheDocument();
    });
  });

  describe("className prop", () => {
    it("applies custom className", async () => {
      const { container } = render(
        <DashboardWidgets className="custom-class" />
      );

      await waitFor(() => {
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
      });

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("stat box colors", () => {
    it("shows success color for high response rate", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_stats") {
          return Promise.resolve({ ...mockAppStats, response_rate: 0.5 });
        }
        return Promise.resolve([]);
      });

      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("50% response rate")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Analytics Dashboard"));

      const responseRateBox = screen.getByText("Response Rate").closest("div");
      expect(responseRateBox?.className).toContain("bg-green-50");
    });

    it("shows warning color for medium response rate", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_stats") {
          return Promise.resolve({ ...mockAppStats, response_rate: 0.2 });
        }
        return Promise.resolve([]);
      });

      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("20% response rate")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Analytics Dashboard"));

      const responseRateBox = screen.getByText("Response Rate").closest("div");
      expect(responseRateBox?.className).toContain("bg-amber-50");
    });

    it("shows danger color for low response rate", async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === "get_application_stats") {
          return Promise.resolve({ ...mockAppStats, response_rate: 0.1 });
        }
        return Promise.resolve([]);
      });

      render(<DashboardWidgets />);

      await waitFor(() => {
        expect(screen.getByText("10% response rate")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Analytics Dashboard"));

      const responseRateBox = screen.getByText("Response Rate").closest("div");
      expect(responseRateBox?.className).toContain("bg-red-50");
    });
  });
});
