import { useState, useEffect, useCallback, memo } from "react";
import { invalidateCacheByCommand, safeInvoke } from "../utils/api";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { StatCard } from "./StatCard";
import { LoadingSpinner } from "./LoadingSpinner";
import { Tooltip } from "./Tooltip";
import { Modal } from "./Modal";
import { getUserFriendlyError } from "../utils/errorMessages";
import {
  formatCredentialLabel,
  formatCredentialWarning,
  formatDuration,
  formatRelativeTime,
  formatRunStatus,
  formatSafeIssue,
  formatSourceNextStep,
  formatSourceType,
  getRecentStatus,
  healthStatusConfig,
  selectorHealthConfig,
  type CredentialHealth,
  type HealthSummary,
  type ScraperHealthMetrics,
  type ScraperRun,
  type SmokeTestResult,
} from "./scraperHealthDashboardModel";

interface ScraperHealthDashboardProps {
  onClose: () => void;
}

// Status icon component
function StatusIcon({ status }: { status: string }) {
  const icons = {
    check: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
    warning: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    x: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
    minus: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 12H4"
        />
      </svg>
    ),
    question: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };
  return icons[status as keyof typeof icons] || icons.question;
}

function getSmokeResultStatus(result: SmokeTestResult) {
  const skipped = result.details?.status === "skipped";
  if (skipped) {
    return {
      badge: "Skipped",
      variant: "surface" as const,
      className:
        "bg-surface-50 border-surface-200 dark:bg-surface-800/60 dark:border-surface-700",
    };
  }

  return result.passed
    ? {
        badge: "Worked",
        variant: "success" as const,
        className: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
      }
    : {
        badge: "Problem found",
        variant: "danger" as const,
        className: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
      };
}

export const ScraperHealthDashboard = memo(function ScraperHealthDashboard({
  onClose,
}: ScraperHealthDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [scrapers, setScrapers] = useState<ScraperHealthMetrics[]>([]);
  const [credentials, setCredentials] = useState<CredentialHealth[]>([]);
  const [selectedScraper, setSelectedScraper] = useState<string | null>(null);
  const [runs, setRuns] = useState<ScraperRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [testingAll, setTestingAll] = useState(false);
  const [testingSingle, setTestingSingle] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<SmokeTestResult[]>([]);
  const [showTestResults, setShowTestResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceNameById = new Map(
    scrapers.map((scraper) => [scraper.scraper_name, scraper.display_name]),
  );
  const getSourceDisplayName = (sourceName: string) =>
    sourceNameById.get(sourceName) ?? sourceName;

  // Load health data
  const loadHealthData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, scrapersData, credentialsData] = await Promise.all([
        safeInvoke<HealthSummary>(
          "get_health_summary",
          {},
          { logContext: "Load health summary" },
        ),
        safeInvoke<ScraperHealthMetrics[]>(
          "get_scraper_health",
          {},
          { logContext: "Load source status" },
        ),
        safeInvoke<CredentialHealth[]>(
          "get_expiring_credentials",
          {},
          { logContext: "Load credential health" },
        ),
      ]);

      if (signal?.aborted) return;

      setSummary(summaryData);
      setScrapers(scrapersData);
      setCredentials(credentialsData);
    } catch (err: unknown) {
      if (signal?.aborted) return;
      const friendly = getUserFriendlyError(err);
      setError(friendly.action ?? friendly.message);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // Load check history for a source
  const loadRunHistory = useCallback(
    async (scraperName: string, signal?: AbortSignal) => {
      try {
        setRunsLoading(true);
        const runsData = await safeInvoke<ScraperRun[]>(
          "get_scraper_runs",
          {
            scraperName,
            limit: 20,
          },
          {
            logContext: "Load source check history",
            silent: true,
          },
        );

        if (signal?.aborted) return;
        setRuns(runsData);
      } catch {
        if (signal?.aborted) return;
        // Silent failure - non-critical
      } finally {
        if (!signal?.aborted) {
          setRunsLoading(false);
        }
      }
    },
    [],
  );

  // Toggle source enabled
  const toggleScraper = useCallback(
    async (scraperName: string, enabled: boolean) => {
      try {
        await safeInvoke(
          "set_scraper_enabled",
          { scraperName, enabled },
          {
            logContext: "Toggle source enabled",
          },
        );
        invalidateCacheByCommand("get_config");
        invalidateCacheByCommand("get_dashboard_preferences");
        // Reload data
        await loadHealthData();
      } catch {
        // Error already logged
      }
    },
    [loadHealthData],
  );

  // Run source check for one source
  const runSmokeTest = useCallback(
    async (scraperName: string) => {
      try {
        setTestingSingle(scraperName);
        const result = await safeInvoke<SmokeTestResult>(
          "run_scraper_smoke_test",
          { scraperName },
          {
            logContext: "Run source check",
          },
        );
        setTestResults([result]);
        setShowTestResults(true);
        // Reload health data after test
        await loadHealthData();
      } catch {
        // Error already logged
      } finally {
        setTestingSingle(null);
      }
    },
    [loadHealthData],
  );

  // Run source checks for all sources
  const runAllSmokeTests = useCallback(async () => {
    try {
      setTestingAll(true);
      const results = await safeInvoke<SmokeTestResult[]>(
        "run_all_smoke_tests",
        {},
        {
          logContext: "Run all source checks",
        },
      );
      setTestResults(results);
      setShowTestResults(true);
      // Reload health data after tests
      await loadHealthData();
    } catch {
      // Error already logged
    } finally {
      setTestingAll(false);
    }
  }, [loadHealthData]);

  // Initial load
  useEffect(() => {
    const controller = new AbortController();

    loadHealthData(controller.signal);

    return () => controller.abort();
  }, [loadHealthData]);

  // Load runs when scraper selected
  useEffect(() => {
    const controller = new AbortController();

    if (selectedScraper) {
      loadRunHistory(selectedScraper, controller.signal);
    }

    return () => controller.abort();
  }, [selectedScraper, loadRunHistory]);

  if (loading) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        title="Job Sources"
        description="Loading job sources"
        size="md"
      >
        <LoadingSpinner message="Loading job sources" delay={0} fullScreen={false} />
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        title="Could not check job sources"
        size="md"
      >
        <p className="mb-4 break-words text-danger [overflow-wrap:anywhere]">{error}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => loadHealthData()}>Try Again</Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title="Job Sources"
        description="Check whether job sources are available and when they last found jobs."
        size="wide"
      >
        <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={runAllSmokeTests}
                  disabled={testingAll}
                >
                  {testingAll ? "Checking..." : "Check Sources Now"}
                </Button>
                <Button variant="secondary" onClick={() => loadHealthData()}>
                  Refresh
                </Button>
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
              </div>

            {/* Summary Stats */}
            {summary && (
              <div
                className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6"
                role="region"
                aria-label="Job source summary"
              >
                <StatCard
                  label="Sources"
                  value={summary.total_scrapers}
                  accentColor="surface"
                />
                <StatCard
                  label="Working"
                  value={summary.healthy}
                  accentColor="sentinel"
                  icon={<StatusIcon status="check" />}
                />
                <StatCard
                  label="Having trouble"
                  value={summary.degraded}
                  accentColor="alert"
                  icon={<StatusIcon status="warning" />}
                />
                <StatCard
                  label="Not working"
                  value={summary.down}
                  accentColor="alert"
                  icon={<StatusIcon status="x" />}
                />
                <StatCard
                  label="Off"
                  value={summary.disabled}
                  accentColor="surface"
                  icon={<StatusIcon status="minus" />}
                />
                <StatCard
                  label="Jobs found today"
                  value={summary.total_jobs_24h}
                  accentColor="sentinel"
                />
              </div>
            )}

            {/* Connection Warnings */}
            {credentials.length > 0 && (
              <div
                className="mb-6 p-4 bg-alert-50 dark:bg-alert-900/20 rounded-lg border border-alert-200 dark:border-alert-800"
                role="alert"
                aria-live="polite"
              >
                <h3 className="font-medium text-alert-700 dark:text-alert-400 mb-2">
                  Connections Needing Attention
                </h3>
                <p className="text-sm text-alert-600 dark:text-alert-300 mb-3">
                  Open Settings and update these saved connections if alerts or
                  job-site checks stop working.
                </p>
                <div className="space-y-2">
                  {credentials.map((cred) => (
                    <div
                      key={cred.key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-alert-600 dark:text-alert-300">
                        {formatCredentialLabel(cred.key)}
                      </span>
                      <span className="text-alert-500 dark:text-alert-400">
                        {formatCredentialWarning(cred)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source List */}
            <div className="overflow-visible">
              <table
                className="app-responsive-table w-full text-sm"
                role="table"
                aria-label="Job source status"
              >
                <thead>
                  <tr
                    className="border-b border-surface-200 dark:border-surface-700"
                    role="row"
                  >
                    <th className="text-left py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Source
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Kind
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Recent Status
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Time Needed
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Jobs Found
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Last Checked
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Reads Job Details
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      What To Do
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scrapers.map((scraper) => {
                    const statusConfig =
                      healthStatusConfig[scraper.health_status];
                    const selectorConfig =
                      selectorHealthConfig[scraper.selector_health];
                    const recentStatus = getRecentStatus(scraper);

                    return (
                      <tr
                        key={scraper.scraper_name}
                        className={`border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-colors ${
                          selectedScraper === scraper.scraper_name
                            ? "bg-sentinel-50 dark:bg-sentinel-900/20"
                            : ""
                        }`}
                      >
                        <td className="py-3 px-4" data-label="Source">
                          <button
                            onClick={() =>
                              setSelectedScraper(
                                selectedScraper === scraper.scraper_name
                                  ? null
                                  : scraper.scraper_name,
                              )
                            }
                            className="text-left hover:text-sentinel-600 dark:hover:text-sentinel-400"
                          >
                            <div className="font-medium text-surface-900 dark:text-white">
                              {scraper.display_name}
                            </div>
                            <div className="text-xs text-surface-500">
                              {scraper.requires_auth && (
                                <span className="ml-1 text-alert-500">
                                  Needs setup
                                </span>
                              )}
                            </div>
                          </button>
                        </td>
                        <td className="py-3 px-4" data-label="Status">
                          <Badge variant={statusConfig.variant} size="sm">
                            <StatusIcon status={statusConfig.icon} />
                            <span className="ml-1">{statusConfig.label}</span>
                          </Badge>
                        </td>
                        <td className="py-3 px-4" data-label="Kind">
                          <Badge variant="surface" size="sm">
                            {formatSourceType(scraper.scraper_type)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right" data-label="Recent Status">
                          <span className={recentStatus.className}>
                            {recentStatus.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-surface-600 dark:text-surface-400" data-label="Time Needed">
                          {formatDuration(scraper.avg_duration_ms)}
                        </td>
                        <td className="py-3 px-4 text-right" data-label="Jobs Found">
                          {scraper.jobs_found_24h === 0 &&
                          scraper.total_runs_24h > 0 &&
                          scraper.health_status === "healthy" ? (
                            <Tooltip content="This job site checked successfully but found 0 jobs. Check your search terms or this source may be empty.">
                              <span className="font-medium text-amber-600 dark:text-amber-400 cursor-help">
                                <span className="inline-flex items-center justify-end gap-1">
                                  0
                                  <StatusIcon status="warning" />
                                </span>
                              </span>
                            </Tooltip>
                          ) : (
                            <span className="font-medium text-surface-900 dark:text-white">
                              {scraper.jobs_found_24h}
                            </span>
                          )}
                          <span className="text-surface-500 ml-1">
                            from {scraper.total_runs_24h} checks
                          </span>
                        </td>
                        <td className="py-3 px-4 text-surface-600 dark:text-surface-400" data-label="Last Checked">
                          {formatRelativeTime(scraper.last_success)}
                        </td>
                        <td className="py-3 px-4" data-label="Reads Job Details">
                          {scraper.scraper_type === "html" ||
                          scraper.scraper_type === "hybrid" ? (
                            <Badge variant={selectorConfig.variant} size="sm">
                              {selectorConfig.label}
                            </Badge>
                          ) : (
                            <span className="text-surface-400">
                              Uses official source
                            </span>
                          )}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-surface-700 dark:text-surface-300" data-label="What To Do">
                          {formatSourceNextStep(scraper)}
                        </td>
                        <td className="py-3 px-4 text-right" data-label="Actions">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              aria-label={
                                scraper.is_enabled
                                  ? `Turn ${scraper.display_name} off`
                                  : `Turn ${scraper.display_name} on`
                              }
                              onClick={() =>
                                toggleScraper(
                                  scraper.scraper_name,
                                  !scraper.is_enabled,
                                )
                              }
                              className={`min-w-20 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                scraper.is_enabled
                                  ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
                                  : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-300"
                              }`}
                            >
                              {scraper.is_enabled ? "Turn Off" : "Turn On"}
                            </button>
                            <button
                              aria-label={`Check ${scraper.display_name} now`}
                              onClick={() =>
                                runSmokeTest(scraper.scraper_name)
                              }
                              disabled={
                                testingSingle === scraper.scraper_name ||
                                !scraper.is_enabled
                              }
                              className="min-w-20 rounded bg-surface-100 px-2.5 py-1.5 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-200 disabled:opacity-50 dark:bg-surface-700 dark:text-surface-300"
                            >
                              {testingSingle === scraper.scraper_name
                                ? "Checking..."
                                : "Check Now"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Check History Panel */}
            {selectedScraper && (
              <div
                className="mt-6 p-4 bg-surface-50 dark:bg-surface-700/30 rounded-lg"
                role="region"
                aria-labelledby="run-history-title"
                aria-live="polite"
              >
                <h3
                  id="run-history-title"
                  className="font-medium text-surface-900 dark:text-white mb-4"
                >
                  Recent Checks:{" "}
                  {
                    scrapers.find((s) => s.scraper_name === selectedScraper)
                      ?.display_name
                  }
                </h3>
                {runsLoading ? (
                  <LoadingSpinner message="Loading check history..." />
                ) : runs.length === 0 ? (
                  <p
                    className="text-surface-500 dark:text-surface-400"
                    role="status"
                  >
                    No recent checks found.
                  </p>
                ) : (
                  <div className="overflow-visible">
                    <table
                      className="app-responsive-table w-full text-sm"
                      role="table"
                      aria-label="Source check history"
                    >
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-600">
                          <th className="text-left py-2 px-3 font-medium text-surface-600 dark:text-surface-400">
                            Checked
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-surface-600 dark:text-surface-400">
                            Status
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-surface-600 dark:text-surface-400">
                            Time
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-surface-600 dark:text-surface-400">
                            Jobs found
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-surface-600 dark:text-surface-400">
                            New jobs
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-surface-600 dark:text-surface-400">
                            Problem
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {runs.map((run) => (
                          <tr
                            key={run.id}
                            className="border-b border-surface-100 dark:border-surface-600/50"
                          >
                            <td className="px-3 py-2 text-surface-600 dark:text-surface-400" data-label="Checked">
                              {formatRelativeTime(run.started_at)}
                            </td>
                            <td className="px-3 py-2" data-label="Status">
                              <Badge
                                variant={
                                  run.status === "success"
                                    ? "success"
                                    : run.status === "running"
                                      ? "sentinel"
                                      : run.status === "rate_limited"
                                        ? "alert"
                                        : "danger"
                                }
                                size="sm"
                              >
                                {formatRunStatus(run.status, run.retry_attempt)}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right text-surface-600 dark:text-surface-400" data-label="Time">
                              {formatDuration(run.duration_ms)}
                            </td>
                            <td className="px-3 py-2 text-right text-surface-900 dark:text-white" data-label="Jobs found">
                              {run.jobs_found}
                            </td>
                            <td className="px-3 py-2 text-right text-green-600 dark:text-green-400" data-label="New jobs">
                              +{run.jobs_new}
                            </td>
                            <td className="max-w-xs break-words px-3 py-2 text-surface-500 [overflow-wrap:anywhere] dark:text-surface-400" data-label="Problem">
                              {formatSafeIssue(run.error_message)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
        </div>
      </Modal>

      {/* Check Results Modal */}
      <Modal
        isOpen={showTestResults}
        onClose={() => setShowTestResults(false)}
        title="Check Results"
        size="lg"
      >
        <div className="space-y-3">
          {testResults.map((result) => {
            const status = getSmokeResultStatus(result);
            return (
              <div
                key={result.scraper_name}
                className={`p-3 rounded-lg border ${status.className}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-surface-900 dark:text-white">
                    {getSourceDisplayName(result.scraper_name)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-surface-500 dark:text-surface-400">
                      {formatDuration(result.duration_ms)}
                    </span>
                    <Badge variant={status.variant} size="sm">
                      {status.badge}
                    </Badge>
                  </div>
                </div>
                {result.error && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {formatSafeIssue(result.error)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => setShowTestResults(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </>
  );
});
