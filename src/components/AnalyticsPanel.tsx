import { useEffect, useState, useCallback, memo } from "react";
import { cachedInvoke } from "../utils/api";
import { Modal } from "./Modal";
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
import {
  getCurrentWeekApplications,
  getSourceDisplayName,
  getWeeklyGoal,
  saveWeeklyGoal,
  SOURCE_COLORS,
  STATUS_COLORS,
  STATUS_LABELS,
  type ApplicationStats,
  type DateRange,
  type WeeklyGoal,
} from "./analyticsPanelModel";
import {
  ApplicationIcon,
  ExportIcon,
  FastIcon,
  InProgressIcon,
  MetricCard,
  OfferIcon,
  ResponseIcon,
  SlowIcon,
} from "./analyticsPanelComponents";

interface AnalyticsPanelProps {
  onClose: () => void;
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

  const handleSetGoal = () => {
    const target = parseInt(goalInput, 10);
    if (!isNaN(target) && target > 0) {
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
      const days = parseInt(dateRange, 10);
      const params = dateRange !== 'all' && !isNaN(days) ? { days } : undefined;
      const data = await cachedInvoke<ApplicationStats>(
        "get_application_stats",
        params,
        30_000
      );
      setStats(data);
    } catch (err: unknown) {
      logError("Failed to fetch application summary:", err);
      setError("Could not load application summary. Try again, or copy a safe support report if this keeps happening.");
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
      ['Employer replies', `${stats.response_rate.toFixed(1)}%`],
      ['Offers received', `${stats.offer_rate.toFixed(1)}%`],
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
    link.download = `job-application-summary-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        title="Application Summary"
        description="Loading application summary"
        size="wide"
        closeButtonLabel="Close application summary"
      >
        <div className="space-y-6" role="status" aria-label="Loading application summary">
          <div className="h-8 w-48 rounded bg-surface-200 motion-safe:animate-pulse dark:bg-surface-700" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded bg-surface-200 motion-safe:animate-pulse dark:bg-surface-700"
              />
            ))}
          </div>
          <div className="h-64 rounded bg-surface-200 motion-safe:animate-pulse dark:bg-surface-700" />
        </div>
      </Modal>
    );
  }

  if (error || !stats) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        title={error || "No application summary yet"}
        description={error ? "There was a problem loading your application summary." : "Start tracking applications to see your summary."}
        size="md"
        closeButtonLabel="Close application summary"
      >
        <div className="text-center">
          <div className="mb-4 text-red-700 dark:text-red-400">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {error && (
              <button
                onClick={fetchStats}
                className="rounded-lg bg-sentinel-600 px-4 py-2 text-white transition-colors hover:bg-sentinel-700"
              >
                Try Again
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg bg-surface-200 px-4 py-2 text-surface-700 transition-colors hover:bg-surface-300 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
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
    <Modal
      isOpen
      onClose={onClose}
      title="Application Summary"
      size="wide"
      closeButtonLabel="Close application summary"
    >
      <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-sm text-surface-900 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100"
              aria-label="Application summary date range"
            >
              <option value="all">All Time</option>
              <option value="30">Last 30 Days</option>
              <option value="60">Last 60 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 transition-colors hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
              title="Download application summary"
            >
              <ExportIcon />
              Download
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
              label="Employer replies"
              value={`${stats.response_rate.toFixed(1)}%`}
              icon={<ResponseIcon />}
              sublabel="Got a response"
            />
            <MetricCard
              label="Offers received"
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
            {/* Application Status */}
            <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
              <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-4">
                Application Status
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

            {/* Application progress */}
            <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
              <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-4">
                Application Progress
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
                  No progress data yet
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

          {/* Response rate by source */}
          {stats.by_source && stats.by_source.length > 0 && (
            <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
              <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-4">
                Replies by Job Source
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
                          {getSourceDisplayName(source.source)}
                        </span>
                        <span className="text-sm text-surface-500 dark:text-surface-400">
                          {source.count} applications · {source.response_rate.toFixed(0)}% replies
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

          {/* Average Reply Time */}
          {stats.avg_response_days !== undefined && stats.avg_response_days > 0 && (
            <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
              <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-2">
                Average Reply Time
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-surface-900 dark:text-white">
                  {stats.avg_response_days.toFixed(1)}
                </span>
                <span className="text-surface-500 dark:text-surface-400">
                  days from application to first reply
                </span>
              </div>
            </div>
          )}

          {/* Weekly application plan */}
          <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-surface-800 dark:text-surface-200">
                Weekly Application Plan
              </h3>
              <button
                onClick={() => setShowGoalInput(!showGoalInput)}
                className="text-sm text-sentinel-600 dark:text-sentinel-400 hover:underline"
              >
                {weeklyGoal ? 'Edit Plan' : 'Set Plan'}
              </button>
            </div>
            {showGoalInput ? (
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="Applications per week"
                  aria-label="Weekly application plan"
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
                    Planned applications reached this week.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Set a weekly plan to pace your applications
              </p>
            )}
          </div>

          {/* Company reply timing */}
          {stats.company_response_times && stats.company_response_times.length > 0 && (
            <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
              <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-4">
                Employer Reply Times
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fastest Replies */}
                <div>
                  <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                    <FastIcon /> Fastest Replies
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
                          <span className="min-w-0 break-words font-medium text-surface-800 [overflow-wrap:anywhere] dark:text-surface-200">
                            {company.company}
                          </span>
                          <span className="text-green-600 dark:text-green-400 whitespace-nowrap ml-2">
                            {company.avg_days?.toFixed(0)} days
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                {/* Slowest Replies */}
                <div>
                  <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                    <SlowIcon /> Slowest Replies
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
                          <span className="min-w-0 break-words font-medium text-surface-800 [overflow-wrap:anywhere] dark:text-surface-200">
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
                    Awaiting Reply ({stats.company_response_times.filter((c) => c.avg_days === null).length} companies)
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
              Status Details
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
    </Modal>
  );
});
