import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "./Button";
import { Card, CardHeader } from "./Card";
import { Badge } from "./Badge";
import { StatCard } from "./StatCard";
import { LoadingSpinner } from "./LoadingSpinner";
import { Tooltip } from "./Tooltip";
import { Modal } from "./Modal";

// Types matching Rust backend
interface ScraperHealthMetrics {
  scraper_name: string;
  display_name: string;
  is_enabled: boolean;
  requires_auth: boolean;
  scraper_type: "api" | "html" | "hybrid";
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
  success: boolean;
  response_time_ms: number;
  error_message: string | null;
  tested_at: string;
}

interface CredentialHealth {
  credential_name: string;
  is_valid: boolean;
  expires_at: string | null;
  days_until_expiry: number | null;
  last_validated: string | null;
  warning_message: string | null;
}

interface ScraperHealthDashboardProps {
  onClose: () => void;
}

// Health status badge variants
const healthStatusConfig = {
  healthy: { variant: "success" as const, label: "Healthy", icon: "check" },
  degraded: { variant: "alert" as const, label: "Degraded", icon: "warning" },
  down: { variant: "danger" as const, label: "Down", icon: "x" },
  disabled: { variant: "surface" as const, label: "Disabled", icon: "minus" },
  unknown: { variant: "surface" as const, label: "Unknown", icon: "question" },
};

const selectorHealthConfig = {
  healthy: { variant: "success" as const, label: "OK" },
  degraded: { variant: "alert" as const, label: "Degraded" },
  broken: { variant: "danger" as const, label: "Broken" },
  unknown: { variant: "surface" as const, label: "N/A" },
};

// Format duration in ms to human readable
function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
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

// Status icon component
function StatusIcon({ status }: { status: string }) {
  const icons = {
    check: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    warning: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    x: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    minus: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
    question: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
  return icons[status as keyof typeof icons] || icons.question;
}

export function ScraperHealthDashboard({ onClose }: ScraperHealthDashboardProps) {
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

  // Load health data
  const loadHealthData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, scrapersData, credentialsData] = await Promise.all([
        invoke<HealthSummary>("get_health_summary"),
        invoke<ScraperHealthMetrics[]>("get_scraper_health"),
        invoke<CredentialHealth[]>("get_expiring_credentials"),
      ]);

      setSummary(summaryData);
      setScrapers(scrapersData);
      setCredentials(credentialsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load run history for a scraper
  const loadRunHistory = useCallback(async (scraperName: string) => {
    try {
      setRunsLoading(true);
      const runsData = await invoke<ScraperRun[]>("get_scraper_runs", {
        scraperName,
        limit: 20,
      });
      setRuns(runsData);
    } catch (err) {
      console.error("Failed to load run history:", err);
    } finally {
      setRunsLoading(false);
    }
  }, []);

  // Toggle scraper enabled
  const toggleScraper = useCallback(async (scraperName: string, enabled: boolean) => {
    try {
      await invoke("set_scraper_enabled", { scraperName, enabled });
      // Reload data
      await loadHealthData();
    } catch (err) {
      console.error("Failed to toggle scraper:", err);
    }
  }, [loadHealthData]);

  // Run smoke test for single scraper
  const runSmokeTest = useCallback(async (scraperName: string) => {
    try {
      setTestingSingle(scraperName);
      const result = await invoke<SmokeTestResult>("run_scraper_smoke_test", { scraperName });
      setTestResults([result]);
      setShowTestResults(true);
      // Reload health data after test
      await loadHealthData();
    } catch (err) {
      console.error("Failed to run smoke test:", err);
    } finally {
      setTestingSingle(null);
    }
  }, [loadHealthData]);

  // Run smoke tests for all scrapers
  const runAllSmokeTests = useCallback(async () => {
    try {
      setTestingAll(true);
      const results = await invoke<SmokeTestResult[]>("run_all_smoke_tests");
      setTestResults(results);
      setShowTestResults(true);
      // Reload health data after tests
      await loadHealthData();
    } catch (err) {
      console.error("Failed to run smoke tests:", err);
    } finally {
      setTestingAll(false);
    }
  }, [loadHealthData]);

  // Initial load
  useEffect(() => {
    loadHealthData();
  }, [loadHealthData]);

  // Load runs when scraper selected
  useEffect(() => {
    if (selectedScraper) {
      loadRunHistory(selectedScraper);
    }
  }, [selectedScraper, loadRunHistory]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <LoadingSpinner message="Loading scraper health..." />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader title="Error" />
          <p className="text-danger mb-4">{error}</p>
          <div className="flex gap-2">
            <Button onClick={loadHealthData}>Retry</Button>
            <Button variant="secondary" onClick={onClose}>Close</Button>
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
                  Scraper Health Dashboard
                </h2>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                  Monitor the health and performance of all 13 job board scrapers
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={runAllSmokeTests}
                  disabled={testingAll}
                >
                  {testingAll ? "Testing..." : "Test All"}
                </Button>
                <Button variant="secondary" onClick={loadHealthData}>
                  Refresh
                </Button>
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>

            {/* Summary Stats */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                <StatCard
                  label="Total Scrapers"
                  value={summary.total_scrapers}
                  accentColor="surface"
                />
                <StatCard
                  label="Healthy"
                  value={summary.healthy}
                  accentColor="sentinel"
                  icon={<StatusIcon status="check" />}
                />
                <StatCard
                  label="Degraded"
                  value={summary.degraded}
                  accentColor="alert"
                  icon={<StatusIcon status="warning" />}
                />
                <StatCard
                  label="Down"
                  value={summary.down}
                  accentColor="alert"
                  icon={<StatusIcon status="x" />}
                />
                <StatCard
                  label="Disabled"
                  value={summary.disabled}
                  accentColor="surface"
                  icon={<StatusIcon status="minus" />}
                />
                <StatCard
                  label="Jobs (24h)"
                  value={summary.total_jobs_24h}
                  accentColor="sentinel"
                />
              </div>
            )}

            {/* Credential Warnings */}
            {credentials.length > 0 && (
              <div className="mb-6 p-4 bg-alert-50 dark:bg-alert-900/20 rounded-lg border border-alert-200 dark:border-alert-800">
                <h3 className="font-medium text-alert-700 dark:text-alert-400 mb-2">
                  Credential Warnings
                </h3>
                <div className="space-y-2">
                  {credentials.map((cred) => (
                    <div
                      key={cred.credential_name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-alert-600 dark:text-alert-300">
                        {cred.credential_name}
                      </span>
                      <span className="text-alert-500 dark:text-alert-400">
                        {cred.warning_message || `Expires in ${cred.days_until_expiry} days`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scraper List */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700">
                    <th className="text-left py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Scraper
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Type
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Success Rate
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Avg Duration
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Jobs (24h)
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Last Success
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Selectors
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-surface-600 dark:text-surface-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scrapers.map((scraper) => {
                    const statusConfig = healthStatusConfig[scraper.health_status];
                    const selectorConfig = selectorHealthConfig[scraper.selector_health];

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
                                  : scraper.scraper_name
                              )
                            }
                            className="text-left hover:text-sentinel-600 dark:hover:text-sentinel-400"
                          >
                            <div className="font-medium text-surface-900 dark:text-white">
                              {scraper.display_name}
                            </div>
                            <div className="text-xs text-surface-500">
                              {scraper.scraper_name}
                              {scraper.requires_auth && (
                                <span className="ml-1 text-alert-500">(auth)</span>
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
                            {scraper.scraper_type.toUpperCase()}
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
                          <span className="font-medium text-surface-900 dark:text-white">
                            {scraper.jobs_found_24h}
                          </span>
                          <span className="text-surface-500 ml-1">
                            / {scraper.total_runs_24h} runs
                          </span>
                        </td>
                        <td className="py-3 px-4 text-surface-600 dark:text-surface-400">
                          {formatRelativeTime(scraper.last_success)}
                        </td>
                        <td className="py-3 px-4">
                          {scraper.scraper_type === "html" || scraper.scraper_type === "hybrid" ? (
                            <Badge variant={selectorConfig.variant} size="sm">
                              {selectorConfig.label}
                            </Badge>
                          ) : (
                            <span className="text-surface-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Tooltip content={scraper.is_enabled ? "Disable" : "Enable"}>
                              <button
                                onClick={() =>
                                  toggleScraper(scraper.scraper_name, !scraper.is_enabled)
                                }
                                className={`p-1.5 rounded transition-colors ${
                                  scraper.is_enabled
                                    ? "bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-surface-100 text-surface-400 hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-500"
                                }`}
                              >
                                {scraper.is_enabled ? (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )}
                              </button>
                            </Tooltip>
                            <Tooltip content="Run smoke test">
                              <button
                                onClick={() => runSmokeTest(scraper.scraper_name)}
                                disabled={testingSingle === scraper.scraper_name || !scraper.is_enabled}
                                className="p-1.5 rounded bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-400 disabled:opacity-50 transition-colors"
                              >
                                {testingSingle === scraper.scraper_name ? (
                                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Run History Panel */}
            {selectedScraper && (
              <div className="mt-6 p-4 bg-surface-50 dark:bg-surface-700/30 rounded-lg">
                <h3 className="font-medium text-surface-900 dark:text-white mb-4">
                  Recent Runs: {scrapers.find((s) => s.scraper_name === selectedScraper)?.display_name}
                </h3>
                {runsLoading ? (
                  <LoadingSpinner message="Loading run history..." />
                ) : runs.length === 0 ? (
                  <p className="text-surface-500 dark:text-surface-400">No recent runs found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-600">
                          <th className="text-left py-2 px-3 font-medium text-surface-600 dark:text-surface-400">
                            Started
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-surface-600 dark:text-surface-400">
                            Status
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-surface-600 dark:text-surface-400">
                            Duration
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-surface-600 dark:text-surface-400">
                            Jobs Found
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-surface-600 dark:text-surface-400">
                            New Jobs
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-surface-600 dark:text-surface-400">
                            Error
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
                                {run.status}
                                {run.retry_attempt > 0 && ` (retry ${run.retry_attempt})`}
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
                              {run.error_message || "-"}
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

      {/* Smoke Test Results Modal */}
      <Modal
        isOpen={showTestResults}
        onClose={() => setShowTestResults(false)}
        title="Smoke Test Results"
        size="lg"
      >
        <div className="space-y-3">
          {testResults.map((result) => (
            <div
              key={result.scraper_name}
              className={`p-3 rounded-lg border ${
                result.success
                  ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                  : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-surface-900 dark:text-white">
                  {result.scraper_name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-surface-500 dark:text-surface-400">
                    {result.response_time_ms}ms
                  </span>
                  <Badge variant={result.success ? "success" : "danger"} size="sm">
                    {result.success ? "PASS" : "FAIL"}
                  </Badge>
                </div>
              </div>
              {result.error_message && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {result.error_message}
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
}
