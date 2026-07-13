import { useEffect, useState, useCallback, memo } from "react";
import { cachedInvoke } from "../../utils/api";
import { Modal } from "../../ui/Modal";
import { logError } from "../../shared/errorReporting/logger";
import {
  getWeeklyGoal,
  saveWeeklyGoal,
  STATUS_LABELS,
  type ApplicationStats,
  type DateRange,
  type WeeklyGoal,
} from "./analyticsPanelModel";
import { AnalyticsDashboard } from "./AnalyticsDashboard";

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

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Application Summary"
      size="wide"
      closeButtonLabel="Close application summary"
    >
      <AnalyticsDashboard
        dateRange={dateRange}
        goalInput={goalInput}
        handleExportCSV={handleExportCSV}
        handleSetGoal={handleSetGoal}
        setDateRange={setDateRange}
        setGoalInput={setGoalInput}
        setShowGoalInput={setShowGoalInput}
        showGoalInput={showGoalInput}
        stats={stats}
        weeklyGoal={weeklyGoal}
      />
    </Modal>
  );
});
