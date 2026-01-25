import { useEffect, useState, useCallback, memo } from "react";
import { cachedInvoke } from "../utils/api";
import { Card } from "./Card";
import { logError } from "../utils/errorUtils";
import { BarChart } from "recharts/es6/chart/BarChart";
import { Bar } from "recharts/es6/cartesian/Bar";
import { XAxis } from "recharts/es6/cartesian/XAxis";
import { YAxis } from "recharts/es6/cartesian/YAxis";
import { CartesianGrid } from "recharts/es6/cartesian/CartesianGrid";
import { Tooltip } from "recharts/es6/component/Tooltip";
import { ResponsiveContainer } from "recharts/es6/component/ResponsiveContainer";
import { PieChart } from "recharts/es6/chart/PieChart";
import { Pie } from "recharts/es6/polar/Pie";
import { Cell } from "recharts/es6/component/Cell";
import { Legend } from "recharts/es6/component/Legend";

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

interface SourceStats {
  source: string;
  count: number;
  response_rate: number;
}

interface CompanyResponseStats {
  company: string;
  applications: number;
  responses: number;
  avg_days: number | null;
}

interface ApplicationStats {
  total: number;
  by_status: StatusCounts;
  response_rate: number;
  offer_rate: number;
  weekly_applications: WeeklyData[];
  by_source?: SourceStats[];
  avg_response_days?: number;
  company_response_times?: CompanyResponseStats[];
}

// Weekly goals localStorage key
const WEEKLY_GOALS_KEY = "jobsentinel_weekly_goals";

interface WeeklyGoal {
  target: number;
  weekStart: string;
}

type DateRange = 'all' | '30' | '60' | '90';

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

// Source name mappings for display
const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  jobswithgpt: 'JobsWithGPT',
  glassdoor: 'Glassdoor',
  direct: 'Direct',
  other: 'Other',
};

const SOURCE_COLORS: Record<string, string> = {
  linkedin: '#0A66C2',
  greenhouse: '#3AB549',
  lever: '#5B21B6',
  jobswithgpt: '#F59E0B',
  glassdoor: '#00A264',
  direct: '#6B7280',
  other: '#9CA3AF',
};

function getWeeklyGoal(): WeeklyGoal | null {
  try {
    const stored = localStorage.getItem(WEEKLY_GOALS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveWeeklyGoal(target: number): void {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  const goal: WeeklyGoal = {
    target,
    weekStart: weekStart.toISOString(),
  };
  localStorage.setItem(WEEKLY_GOALS_KEY, JSON.stringify(goal));
}

function getCurrentWeekApplications(weeklyData: WeeklyData[]): number {
  if (weeklyData.length === 0) return 0;
  // The most recent week is the current week
  return weeklyData[weeklyData.length - 1]?.count || 0;
}

export const AnalyticsPanel = memo(function AnalyticsPanel({ onClose }: AnalyticsPanelProps) {
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  // Load weekly goal on mount
  useEffect(() => {
    setWeeklyGoal(getWeeklyGoal());
  }, []);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSetGoal = () => {
    const target = parseInt(goalInput);
    if (target > 0) {
      saveWeeklyGoal(target);
      setWeeklyGoal(getWeeklyGoal());
      setShowGoalInput(false);
      setGoalInput('');
    }
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Pass date range filter if not 'all'
      const params = dateRange !== 'all' ? { days: parseInt(dateRange) } : undefined;
      const data = await cachedInvoke<ApplicationStats>(
        "get_application_stats",
        params,
        30_000
      );
      setStats(data);
    } catch (err) {
      logError("Failed to fetch analytics:", err);
      setError("Failed to load analytics data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleExportCSV = () => {
    if (!stats) return;

    const rows: string[][] = [
      ['Metric', 'Value'],
      ['Total Applications', stats.total.toString()],
      ['Response Rate', `${stats.response_rate.toFixed(1)}%`],
      ['Offer Rate', `${stats.offer_rate.toFixed(1)}%`],
      [''],
      ['Status', 'Count'],
      ...Object.entries(stats.by_status).map(([status, count]) => [
        STATUS_LABELS[status] || status,
        count.toString(),
      ]),
    ];

    if (stats.weekly_applications.length > 0) {
      rows.push([''], ['Week', 'Applications']);
      stats.weekly_applications.forEach(({ week, count }) => {
        rows.push([week, count.toString()]);
      });
    }

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `job-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

  if (error || !stats) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="dialog"
        aria-modal="true"
        aria-label="Analytics error"
      >
        <Card className="w-full max-w-md dark:bg-surface-800 text-center p-8">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
            {error || "No analytics data available"}
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
            {error ? "There was a problem loading your analytics." : "Start tracking applications to see your analytics."}
          </p>
          <div className="flex justify-center gap-3">
            {error && (
              <button
                onClick={fetchStats}
                className="px-4 py-2 bg-sentinel-500 text-white rounded-lg hover:bg-sentinel-600 transition-colors"
              >
                Try Again
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors"
            >
              Close
            </button>
          </div>
        </Card>
      </div>
    );
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
            <div className="flex items-center gap-3">
              {/* Date Range Filter */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="text-sm px-3 py-1.5 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
              >
                <option value="all">All Time</option>
                <option value="30">Last 30 Days</option>
                <option value="60">Last 60 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
              {/* Export Button */}
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1 text-sm px-3 py-1.5 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg text-surface-700 dark:text-surface-300 transition-colors"
                title="Export to CSV"
              >
                <ExportIcon />
                Export
              </button>
              <button
                onClick={onClose}
                className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                aria-label="Close analytics"
              >
                <CloseIcon />
              </button>
            </div>
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
                      label={({ name, percent }) => {
                        const pct = (percent ?? 0) * 100;
                        const display = pct > 0 && pct < 1 ? "< 1" : pct.toFixed(0);
                        return `${name} ${display}%`;
                      }}
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

          {/* Response Rate by Source */}
          {stats.by_source && stats.by_source.length > 0 && (
            <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
              <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-4">
                Performance by Job Source
              </h3>
              <div className="space-y-3">
                {stats.by_source.map((source) => (
                  <div key={source.source} className="flex items-center gap-3">
                    <div
                      className="w-2 h-8 rounded-full"
                      style={{ backgroundColor: SOURCE_COLORS[source.source.toLowerCase()] || '#6B7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-surface-800 dark:text-surface-200">
                          {SOURCE_LABELS[source.source.toLowerCase()] || source.source}
                        </span>
                        <span className="text-sm text-surface-500 dark:text-surface-400">
                          {source.count} apps · {source.response_rate.toFixed(0)}% response
                        </span>
                      </div>
                      <div className="h-2 bg-surface-200 dark:bg-surface-600 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${source.response_rate}%`,
                            backgroundColor: SOURCE_COLORS[source.source.toLowerCase()] || '#6B7280',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Average Response Time */}
          {stats.avg_response_days !== undefined && stats.avg_response_days > 0 && (
            <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
              <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-2">
                Average Response Time
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-surface-900 dark:text-white">
                  {stats.avg_response_days.toFixed(1)}
                </span>
                <span className="text-surface-500 dark:text-surface-400">
                  days from application to first response
                </span>
              </div>
            </div>
          )}

          {/* Weekly Goal Tracker */}
          <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-surface-800 dark:text-surface-200">
                Weekly Application Goal
              </h3>
              <button
                onClick={() => setShowGoalInput(!showGoalInput)}
                className="text-sm text-sentinel-600 dark:text-sentinel-400 hover:underline"
              >
                {weeklyGoal ? 'Edit Goal' : 'Set Goal'}
              </button>
            </div>
            {showGoalInput ? (
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="Applications per week"
                  aria-label="Weekly application goal"
                  min={1}
                  className="flex-1 px-3 py-2 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
                />
                <button
                  onClick={handleSetGoal}
                  className="px-3 py-2 text-sm bg-sentinel-500 text-white rounded-lg hover:bg-sentinel-600"
                >
                  Save
                </button>
                <button
                  onClick={() => { setShowGoalInput(false); setGoalInput(''); }}
                  className="px-3 py-2 text-sm text-surface-500 hover:text-surface-700"
                >
                  Cancel
                </button>
              </div>
            ) : null}
            {weeklyGoal ? (
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-bold text-surface-900 dark:text-white">
                    {getCurrentWeekApplications(stats.weekly_applications)} / {weeklyGoal.target}
                  </span>
                  <span className="text-sm text-surface-500">
                    {(() => {
                      const pct = (getCurrentWeekApplications(stats.weekly_applications) / weeklyGoal.target) * 100;
                      if (pct === 0) return "0%";
                      if (pct > 0 && pct < 1) return "< 1%";
                      return `${Math.round(pct)}%`;
                    })()} complete
                  </span>
                </div>
                <div className="h-3 bg-surface-200 dark:bg-surface-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      getCurrentWeekApplications(stats.weekly_applications) >= weeklyGoal.target
                        ? 'bg-green-500'
                        : 'bg-sentinel-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (getCurrentWeekApplications(stats.weekly_applications) / weeklyGoal.target) * 100)}%`,
                    }}
                  />
                </div>
                {getCurrentWeekApplications(stats.weekly_applications) >= weeklyGoal.target && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    🎉 Goal achieved this week!
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Set a weekly goal to track your application progress
              </p>
            )}
          </div>

          {/* Company Response Rates */}
          {stats.company_response_times && stats.company_response_times.length > 0 && (
            <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
              <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-4">
                Company Response Times
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fastest Responders */}
                <div>
                  <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                    <FastIcon /> Fastest Responders
                  </h4>
                  <div className="space-y-2">
                    {stats.company_response_times
                      .filter((c) => c.avg_days !== null)
                      .sort((a, b) => (a.avg_days || 999) - (b.avg_days || 999))
                      .slice(0, 5)
                      .map((company) => (
                        <div
                          key={company.company}
                          className="flex items-center justify-between p-2 bg-white dark:bg-surface-600 rounded text-sm"
                        >
                          <span className="font-medium text-surface-800 dark:text-surface-200 truncate">
                            {company.company}
                          </span>
                          <span className="text-green-600 dark:text-green-400 whitespace-nowrap ml-2">
                            {company.avg_days?.toFixed(0)} days
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                {/* Slowest Responders */}
                <div>
                  <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                    <SlowIcon /> Slowest Responders
                  </h4>
                  <div className="space-y-2">
                    {stats.company_response_times
                      .filter((c) => c.avg_days !== null)
                      .sort((a, b) => (b.avg_days || 0) - (a.avg_days || 0))
                      .slice(0, 5)
                      .map((company) => (
                        <div
                          key={company.company}
                          className="flex items-center justify-between p-2 bg-white dark:bg-surface-600 rounded text-sm"
                        >
                          <span className="font-medium text-surface-800 dark:text-surface-200 truncate">
                            {company.company}
                          </span>
                          <span className="text-amber-600 dark:text-amber-400 whitespace-nowrap ml-2">
                            {company.avg_days?.toFixed(0)} days
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              {/* No Response Yet */}
              {stats.company_response_times.filter((c) => c.avg_days === null).length > 0 && (
                <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-600">
                  <h4 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-2">
                    Awaiting Response ({stats.company_response_times.filter((c) => c.avg_days === null).length} companies)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {stats.company_response_times
                      .filter((c) => c.avg_days === null)
                      .slice(0, 10)
                      .map((company) => (
                        <span
                          key={company.company}
                          className="text-xs px-2 py-1 bg-surface-200 dark:bg-surface-600 rounded text-surface-600 dark:text-surface-400"
                        >
                          {company.company}
                        </span>
                      ))}
                    {stats.company_response_times.filter((c) => c.avg_days === null).length > 10 && (
                      <span className="text-xs px-2 py-1 text-surface-400">
                        +{stats.company_response_times.filter((c) => c.avg_days === null).length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}
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
});

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

function ExportIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

function FastIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function SlowIcon() {
  return (
    <svg
      className="w-4 h-4"
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
