import { useEffect, useState } from "react";
import { cachedInvoke } from "../utils/api";
import { Card } from "./Card";
import { logError } from "../utils/errorUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface StatusCounts {
  to_apply: number;
  applied: number;
  screening_call: number;
  phone_interview: number;
  technical_interview: number;
  onsite_interview: number;
  offer_received: number;
  offer_accepted: number;
  offer_rejected: number;
  rejected: number;
  ghosted: number;
  withdrawn: number;
}

interface WeeklyData {
  week: string;
  count: number;
}

interface ApplicationStats {
  total: number;
  by_status: StatusCounts;
  response_rate: number;
  offer_rate: number;
  weekly_applications: WeeklyData[];
}

interface AnalyticsPanelProps {
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  to_apply: "#6B7280",
  applied: "#3B82F6",
  screening_call: "#8B5CF6",
  phone_interview: "#8B5CF6",
  technical_interview: "#6366F1",
  onsite_interview: "#06B6D4",
  offer_received: "#10B981",
  offer_accepted: "#059669",
  offer_rejected: "#F97316",
  rejected: "#EF4444",
  ghosted: "#9CA3AF",
  withdrawn: "#F59E0B",
};

const STATUS_LABELS: Record<string, string> = {
  to_apply: "To Apply",
  applied: "Applied",
  screening_call: "Screening",
  phone_interview: "Phone",
  technical_interview: "Technical",
  onsite_interview: "Onsite",
  offer_received: "Offer",
  offer_accepted: "Accepted",
  offer_rejected: "Declined",
  rejected: "Rejected",
  ghosted: "Ghosted",
  withdrawn: "Withdrawn",
};

export function AnalyticsPanel({ onClose }: AnalyticsPanelProps) {
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await cachedInvoke<ApplicationStats>(
          "get_application_stats",
          undefined,
          30_000
        );
        setStats(data);
      } catch (err) {
        logError("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="dialog"
        aria-modal="true"
        aria-label="Loading analytics"
      >
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-surface-800">
          <div className="p-6 space-y-6">
            <div className="h-8 w-48 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-surface-200 dark:bg-surface-700 rounded animate-pulse"
                />
              ))}
            </div>
            <div className="h-64 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
          </div>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Prepare pie chart data
  const pieData = Object.entries(stats.by_status)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status] || "#6B7280",
    }));

  // Prepare funnel data (application stages)
  const funnelData = [
    { name: "Applied", value: stats.by_status.applied + stats.by_status.screening_call + stats.by_status.phone_interview + stats.by_status.technical_interview + stats.by_status.onsite_interview + stats.by_status.offer_received + stats.by_status.offer_accepted + stats.by_status.offer_rejected + stats.by_status.rejected + stats.by_status.ghosted },
    { name: "Screening", value: stats.by_status.screening_call + stats.by_status.phone_interview + stats.by_status.technical_interview + stats.by_status.onsite_interview + stats.by_status.offer_received + stats.by_status.offer_accepted + stats.by_status.offer_rejected + stats.by_status.rejected },
    { name: "Interview", value: stats.by_status.phone_interview + stats.by_status.technical_interview + stats.by_status.onsite_interview + stats.by_status.offer_received + stats.by_status.offer_accepted + stats.by_status.offer_rejected },
    { name: "Onsite", value: stats.by_status.onsite_interview + stats.by_status.offer_received + stats.by_status.offer_accepted + stats.by_status.offer_rejected },
    { name: "Offers", value: stats.by_status.offer_received + stats.by_status.offer_accepted + stats.by_status.offer_rejected },
  ].filter((d) => d.value > 0);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="analytics-title"
    >
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-surface-800">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2
              id="analytics-title"
              className="font-display text-display-md text-surface-900 dark:text-white"
            >
              Application Analytics
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              aria-label="Close analytics"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              label="Total Applications"
              value={stats.total.toString()}
              icon={<ApplicationIcon />}
            />
            <MetricCard
              label="Response Rate"
              value={`${stats.response_rate.toFixed(1)}%`}
              icon={<ResponseIcon />}
              sublabel="Got a response"
            />
            <MetricCard
              label="Offer Rate"
              value={`${stats.offer_rate.toFixed(1)}%`}
              icon={<OfferIcon />}
              sublabel="Received offer"
            />
            <MetricCard
              label="In Progress"
              value={(
                stats.by_status.applied +
                stats.by_status.screening_call +
                stats.by_status.phone_interview +
                stats.by_status.technical_interview +
                stats.by_status.onsite_interview
              ).toString()}
              icon={<InProgressIcon />}
              sublabel="Active applications"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
              <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-4">
                Status Distribution
              </h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-surface-400">
                  No application data yet
                </div>
              )}
            </div>

            {/* Application Funnel */}
            <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
              <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-4">
                Application Funnel
              </h3>
              {funnelData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={funnelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-surface-400">
                  No funnel data yet
                </div>
              )}
            </div>
          </div>

          {/* Weekly Applications */}
          {stats.weekly_applications.length > 0 && (
            <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
              <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-4">
                Weekly Applications (Last 12 Weeks)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.weekly_applications}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week"
                    tickFormatter={(w) => w.split("-")[1] || w}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(w) => `Week ${w.split("-")[1] || w}`}
                  />
                  <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Status Breakdown */}
          <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
            <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-4">
              Detailed Status Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Object.entries(stats.by_status).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center gap-2 p-2 bg-white dark:bg-surface-600 rounded"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[status] }}
                  />
                  <div>
                    <div className="text-xs text-surface-500 dark:text-surface-400">
                      {STATUS_LABELS[status]}
                    </div>
                    <div className="font-medium text-surface-800 dark:text-surface-200">
                      {count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  sublabel,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sublabel?: string;
}) {
  return (
    <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-lg text-sentinel-600 dark:text-sentinel-400">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-surface-900 dark:text-white">
            {value}
          </div>
          <div className="text-sm text-surface-500 dark:text-surface-400">
            {label}
          </div>
          {sublabel && (
            <div className="text-xs text-surface-400 dark:text-surface-500">
              {sublabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function ApplicationIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function ResponseIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function OfferIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function InProgressIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
