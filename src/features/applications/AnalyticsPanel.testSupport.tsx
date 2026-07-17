import { vi } from "vitest";

export const mockCachedInvoke = vi.fn();
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

export const mockOnClose = vi.fn();

export const mockStats = {
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

export function setupAnalyticsPanelMocks() {
  vi.clearAllMocks();
  window.localStorage.clear();
  mockCachedInvoke.mockResolvedValue(mockStats);
}

export function cleanupAnalyticsPanelMocks() {
  window.localStorage.clear();
}
