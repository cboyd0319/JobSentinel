import { useState, useEffect, useCallback, memo } from "react";
import { invalidateCacheByCommand, safeInvoke } from "../../../../platform/tauri";
import { Button } from "../../../../ui/Button";
import { StatCard } from "../../../../ui/StatCard";
import { LoadingSpinner } from "../../../../ui/LoadingSpinner";
import { Modal } from "../../../../ui/Modal";
import { getUserFriendlyError } from "../../../../shared/errorReporting/messages";
import {
  JOB_SOURCE_DISCOVERY_TAXONOMY,
  technicalAccessForJobSource,
} from "../../../../shared/jobSourceDiscoveryTaxonomy";
import {
  formatCredentialLabel,
  formatCredentialWarning,
  type CredentialHealth,
  type HealthSummary,
  type ScraperHealthMetrics,
  type ScraperRun,
  type SmokeTestResult,
} from "./scraperHealthDashboardModel";
import {
  ScraperHealthSourceTable,
  StatusIcon,
} from "./ScraperHealthSourceTable";
import { ScraperHealthResultsModal } from "./ScraperHealthResultsModal";

interface ScraperHealthDashboardProps {
  onClose: () => void;
}

type PendingRestrictedSourceCheck =
  | { kind: "all"; sourceNames: string[] }
  | { kind: "single"; scraperName: string; sourceNames: string[] };

const RESTRICTED_SOURCE_CHECK_IDS = new Set(
  JOB_SOURCE_DISCOVERY_TAXONOMY.filter(
    (source) =>
      (source.accessModel === "restricted-user-gated" ||
        source.requiresUserAgreement === true) &&
      technicalAccessForJobSource(source) === "public-unauthenticated",
  ).map((source) => source.id),
);

function sourceCheckNeedsAcknowledgement(scraperName: string): boolean {
  return RESTRICTED_SOURCE_CHECK_IDS.has(scraperName);
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
  const [pendingRestrictedCheck, setPendingRestrictedCheck] =
    useState<PendingRestrictedSourceCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sourceNameById = new Map(
    scrapers.map((scraper) => [scraper.scraper_name, scraper.display_name]),
  );
  const restrictedEnabledSources = scrapers.filter(
    (scraper) =>
      scraper.is_enabled && sourceCheckNeedsAcknowledgement(scraper.scraper_name),
  );

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
    async (scraperName: string, restrictedSourceAcknowledged = false) => {
      try {
        setTestingSingle(scraperName);
        const result = await safeInvoke<SmokeTestResult>(
          "run_scraper_smoke_test",
          { scraperName, restrictedSourceAcknowledged },
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

  const requestSmokeTest = useCallback(
    (scraper: ScraperHealthMetrics) => {
      if (sourceCheckNeedsAcknowledgement(scraper.scraper_name)) {
        setPendingRestrictedCheck({
          kind: "single",
          scraperName: scraper.scraper_name,
          sourceNames: [scraper.display_name],
        });
        return;
      }

      void runSmokeTest(scraper.scraper_name);
    },
    [runSmokeTest],
  );

  // Run source checks for all sources
  const runAllSmokeTests = useCallback(async (restrictedSourceAcknowledged = false) => {
    try {
      setTestingAll(true);
      const results = await safeInvoke<SmokeTestResult[]>(
        "run_all_smoke_tests",
        { restrictedSourceAcknowledged },
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

  const requestAllSmokeTests = useCallback(() => {
    if (restrictedEnabledSources.length > 0) {
      setPendingRestrictedCheck({
        kind: "all",
        sourceNames: restrictedEnabledSources.map((source) => source.display_name),
      });
      return;
    }

    void runAllSmokeTests();
  }, [restrictedEnabledSources, runAllSmokeTests]);

  const continueRestrictedSourceCheck = useCallback(() => {
    const pending = pendingRestrictedCheck;
    setPendingRestrictedCheck(null);

    if (!pending) {
      return;
    }

    if (pending.kind === "single") {
      void runSmokeTest(pending.scraperName, true);
    } else {
      void runAllSmokeTests(true);
    }
  }, [pendingRestrictedCheck, runAllSmokeTests, runSmokeTest]);

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
                  onClick={requestAllSmokeTests}
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

            <ScraperHealthSourceTable
              scrapers={scrapers}
              selectedScraper={selectedScraper}
              runs={runs}
              runsLoading={runsLoading}
              testingSingle={testingSingle}
              onSelectedScraperChange={setSelectedScraper}
              onRequestSmokeTest={requestSmokeTest}
              onToggleScraper={toggleScraper}
            />
        </div>
      </Modal>

      <Modal
        isOpen={pendingRestrictedCheck !== null}
        onClose={() => setPendingRestrictedCheck(null)}
        title="Review Source Check"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-surface-700 dark:text-surface-300">
            Some job boards have rules about automated tools. JobSentinel will
            only check these sources because you asked, from this computer, and
            it will not use saved sign-in sessions.
          </p>
          <p className="text-sm leading-6 text-surface-700 dark:text-surface-300">
            Sources to check:{" "}
            <span className="font-medium">
              {pendingRestrictedCheck?.sourceNames.join(", ")}
            </span>
          </p>
          <p className="text-sm leading-6 text-surface-700 dark:text-surface-300">
            If a site blocks the check or asks for a human review, stop there and
            use a search link, Browser Import, pasted job link, or manual entry.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setPendingRestrictedCheck(null)}
            >
              Cancel
            </Button>
            <Button onClick={continueRestrictedSourceCheck}>
              Continue checking
            </Button>
          </div>
        </div>
      </Modal>

      <ScraperHealthResultsModal
        isOpen={showTestResults}
        onClose={() => setShowTestResults(false)}
        results={testResults}
        sourceNameById={sourceNameById}
      />
    </>
  );
});
