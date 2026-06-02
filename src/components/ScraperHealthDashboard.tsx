import { useState, useEffect, useCallback, memo } from "react";
import { safeInvoke } from "../utils/api";
import { Button } from "./Button";
import { Card, CardHeader } from "./Card";
import { Badge } from "./Badge";
import { StatCard } from "./StatCard";
import { LoadingSpinner } from "./LoadingSpinner";
import { Tooltip } from "./Tooltip";
import { Modal } from "./Modal";
import { getUserFriendlyError } from "../utils/errorMessages";

// Types matching Rust backend
interface ScraperHealthMetrics {
  scraper_name: string;
  display_name: string;
  is_enabled: boolean;
  requires_auth: boolean;
  scraper_type: "api" | "html" | "rss" | "graphql" | "hybrid";
  health_status: "healthy" | "degraded" | "down" | "disabled" | "unknown";
  selector_health: "healthy" | "degraded" | "broken" | "unknown";
  success_rate_24h: number;
  avg_duration_ms: number | null;
  last_success: string | null;
  last_error: string | null;
  total_runs_24h: number;
  jobs_found_24h: number;
  rate_limit_per_hour: number;
}

interface HealthSummary {
  total_scrapers: number;
  healthy: number;
  degraded: number;
  down: number;
  disabled: number;
  total_jobs_24h: number;
}

interface ScraperRun {
  id: number;
  scraper_name: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  status: "running" | "success" | "error" | "rate_limited";
  jobs_found: number;
  jobs_new: number;
  error_message: string | null;
  error_code: string | null;
  retry_attempt: number;
}

interface SmokeTestResult {
  scraper_name: string;
  test_type: "connectivity" | "selector" | "auth" | "rate_limit";
  passed: boolean;
  duration_ms: number;
  details: Record<string, unknown> | null;
  error: string | null;
}

interface CredentialHealth {
  key: string;
  created_at: string | null;
  last_validated: string | null;
  expires_at: string | null;
  status: "valid" | "expiring" | "expired" | "unknown";
  days_until_expiry: number | null;
}

interface ScraperHealthDashboardProps {
  onClose: () => void;
}

// Health status badge variants
const healthStatusConfig = {
  healthy: { variant: "success" as const, label: "Working", icon: "check" },
  degraded: { variant: "alert" as const, label: "Having trouble", icon: "warning" },
  down: { variant: "danger" as const, label: "Not working", icon: "x" },
  disabled: { variant: "surface" as const, label: "Off", icon: "minus" },
  unknown: { variant: "surface" as const, label: "Not checked", icon: "question" },
};

const selectorHealthConfig = {
  healthy: { variant: "success" as const, label: "Yes" },
  degraded: { variant: "alert" as const, label: "Having trouble" },
  broken: { variant: "danger" as const, label: "Cannot read jobs" },
  unknown: { variant: "surface" as const, label: "No action needed" },
};

// Format duration in ms to human readable
function formatDuration(ms: number | null): string {
  if (ms === null) return "Not checked yet";
  if (ms < 1000) return "under 1s";
  return `${(ms / 1000).toFixed(1)}s`;
}

// Format relative time
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatCredentialWarning(credential: CredentialHealth): string {
  if (credential.status === "expired") {
    return "Expired";
  }

  if (credential.status === "valid") {
    return "Valid";
  }

  if (credential.days_until_expiry !== null) {
    return `Expires in ${credential.days_until_expiry} days`;
  }

  return "Status unknown";
}

function formatCredentialLabel(key: string): string {
  const labels: Record<string, string> = {
    discord_webhook: "Discord connection",
    smtp_password: "Email password",
    slack_webhook: "Slack connection",
    teams_webhook: "Teams connection",
    telegram_bot_token: "Telegram connection",
    usajobs_api_key: "USAJobs access code",
  };

  return labels[key] ?? "Saved connection";
}

function formatSourceType(type: ScraperHealthMetrics["scraper_type"]): string {
  switch (type) {
    case "api":
    case "graphql":
      return "Official source";
    case "rss":
      return "Feed";
    case "html":
    case "hybrid":
      return "Website page";
  }
}

function formatSourceNextStep(scraper: ScraperHealthMetrics): string {
  if (!scraper.is_enabled) {
    return "Off. Turn on if useful.";
  }

  if (scraper.requires_auth && scraper.health_status !== "healthy") {
    return "Update connection in Settings if this keeps happening.";
  }

  if (scraper.health_status === "down") {
    return "Try again later or turn this source off.";
  }

  if (scraper.health_status === "degraded" || scraper.success_rate_24h < 70) {
    return "Try again later. Use search links if urgent.";
  }

  if (
    scraper.jobs_found_24h === 0 &&
    scraper.total_runs_24h > 0 &&
    scraper.health_status === "healthy"
  ) {
    return "Adjust search words or use search links.";
  }

  return "Working. No action needed.";
}

function formatRunStatus(status: ScraperRun["status"], retryAttempt: number): string {
  const labels: Record<ScraperRun["status"], string> = {
    error: "Problem found",
    rate_limited: "Waiting",
    running: "Checking",
    success: "Worked",
  };
  const label = labels[status];
  return retryAttempt > 0 ? `${label} after another try` : label;
}

function formatSafeIssue(message: string | null): string {
  if (!message) {
    return "-";
  }

  const friendly = getUserFriendlyError(message);
  return friendly.action ?? friendly.message;
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
          { logContext: "Load source health" },
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
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <LoadingSpinner message="Loading job sources..." />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader title="Could not check job sources" />
          <p className="text-danger mb-4">{error}</p>
          <div className="flex gap-2">
            <Button onClick={() => loadHealthData()}>Try Again</Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-display-lg text-surface-900 dark:text-white">
                  Job Sources
                </h2>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                  Check whether job sources are available and when they last
                  found jobs.
                </p>
              </div>
              <div className="flex items-center gap-2">
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
                  source checks stop working.
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
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
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
                      Checks Worked
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Check Time
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Jobs Found
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Last Worked
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Can Read Jobs
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

                    return (
                      <tr
                        key={scraper.scraper_name}
                        className={`border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-colors ${
                          selectedScraper === scraper.scraper_name
                            ? "bg-sentinel-50 dark:bg-sentinel-900/20"
                            : ""
                        }`}
                      >
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4">
                          <Badge variant={statusConfig.variant} size="sm">
                            <StatusIcon status={statusConfig.icon} />
                            <span className="ml-1">{statusConfig.label}</span>
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="surface" size="sm">
                            {formatSourceType(scraper.scraper_type)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={
                              scraper.success_rate_24h >= 90
                                ? "text-green-600 dark:text-green-400"
                                : scraper.success_rate_24h >= 70
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-red-600 dark:text-red-400"
                            }
                          >
                            {scraper.success_rate_24h.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-surface-600 dark:text-surface-400">
                          {formatDuration(scraper.avg_duration_ms)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {scraper.jobs_found_24h === 0 &&
                          scraper.total_runs_24h > 0 &&
                          scraper.health_status === "healthy" ? (
                            <Tooltip content="This source checked successfully but found 0 jobs. Check your search terms or this source may be empty.">
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
                            / {scraper.total_runs_24h} checks
                          </span>
                        </td>
                        <td className="py-3 px-4 text-surface-600 dark:text-surface-400">
                          {formatRelativeTime(scraper.last_success)}
                        </td>
                        <td className="py-3 px-4">
                          {scraper.scraper_type === "html" ||
                          scraper.scraper_type === "hybrid" ? (
                            <Badge variant={selectorConfig.variant} size="sm">
                              {selectorConfig.label}
                            </Badge>
                          ) : (
                            <span className="text-surface-400">Not needed</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-surface-700 dark:text-surface-300 max-w-xs">
                          {formatSourceNextStep(scraper)}
                        </td>
                        <td className="py-3 px-4 text-right">
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
                  <div className="overflow-x-auto">
                    <table
                      className="w-full text-sm"
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
                            Issue
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {runs.map((run) => (
                          <tr
                            key={run.id}
                            className="border-b border-surface-100 dark:border-surface-600/50"
                          >
                            <td className="py-2 px-3 text-surface-600 dark:text-surface-400">
                              {formatRelativeTime(run.started_at)}
                            </td>
                            <td className="py-2 px-3">
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
                            <td className="py-2 px-3 text-right text-surface-600 dark:text-surface-400">
                              {formatDuration(run.duration_ms)}
                            </td>
                            <td className="py-2 px-3 text-right text-surface-900 dark:text-white">
                              {run.jobs_found}
                            </td>
                            <td className="py-2 px-3 text-right text-green-600 dark:text-green-400">
                              +{run.jobs_new}
                            </td>
                            <td className="py-2 px-3 text-surface-500 dark:text-surface-400 max-w-xs truncate">
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
          </Card>
        </div>
      </div>

      {/* Check Results Modal */}
      <Modal
        isOpen={showTestResults}
        onClose={() => setShowTestResults(false)}
        title="Check Results"
        size="lg"
      >
        <div className="space-y-3">
          {testResults.map((result) => (
            <div
              key={result.scraper_name}
              className={`p-3 rounded-lg border ${
                result.passed
                  ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                  : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-surface-900 dark:text-white">
                  {getSourceDisplayName(result.scraper_name)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-surface-500 dark:text-surface-400">
                    {formatDuration(result.duration_ms)}
                  </span>
                  <Badge
                    variant={result.passed ? "success" : "danger"}
                    size="sm"
                  >
                    {result.passed ? "Worked" : "Problem found"}
                  </Badge>
                </div>
              </div>
              {result.error && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {formatSafeIssue(result.error)}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => setShowTestResults(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
});
