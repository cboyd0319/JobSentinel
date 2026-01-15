import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Card, CardHeader, LoadingSpinner, JobCard, ScoreDisplay, ThemeToggle, Tooltip, ModalErrorBoundary } from "../components";
import { useToast } from "../contexts";
import { getErrorMessage, logError } from "../utils/errorUtils";
import Settings from "./Settings";

interface Job {
  id: number;
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string;
  score: number;
  created_at: string;
  description?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  remote?: boolean | null;
}

interface Statistics {
  total_jobs: number;
  high_matches: number;
  average_score: number;
}

interface ScrapingStatus {
  last_scrape: string | null;
  next_scrape: string | null;
  is_running: boolean;
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total_jobs: 0,
    high_matches: 0,
    average_score: 0,
  });
  const [scrapingStatus, setScrapingStatus] = useState<ScrapingStatus>({
    last_scrape: null,
    next_scrape: null,
    is_running: false,
  });
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [jobsData, statsData, statusData] = await Promise.all([
        invoke<Job[]>("get_recent_jobs", { limit: 50 }),
        invoke<Statistics>("get_statistics"),
        invoke<ScrapingStatus>("get_scraping_status"),
      ]);

      setJobs(jobsData);
      setStatistics(statsData);
      setScrapingStatus(statusData);
    } catch (err) {
      logError("Failed to fetch dashboard data:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Only refresh once after initial load (30 seconds) to catch background scraping results
  // No continuous polling - user can click "Search Now" to refresh manually
  useEffect(() => {
    const initialRefresh = setTimeout(() => {
      // Only refresh if we have no jobs yet (background scrape may have finished)
      if (jobs.length === 0) {
        fetchData();
      }
    }, 30000);

    return () => {
      clearTimeout(initialRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run once on mount
  }, []);

  // Cooldown state for search button to prevent rapid repeated clicks
  const [searchCooldown, setSearchCooldown] = useState(false);

  const handleSearchNow = async () => {
    // Prevent rapid repeated clicks (cooldown check)
    if (searchCooldown) {
      toast.info("Please wait", "Search is on cooldown to prevent rate limiting");
      return;
    }

    try {
      setSearching(true);
      setSearchCooldown(true);
      setError(null);
      toast.info("Scanning job boards...", "This may take a moment");
      await invoke("search_jobs");
      // Fetch fresh data and show updated count
      const [jobsData, statsData, statusData] = await Promise.all([
        invoke<Job[]>("get_recent_jobs", { limit: 50 }),
        invoke<Statistics>("get_statistics"),
        invoke<ScrapingStatus>("get_scraping_status"),
      ]);
      setJobs(jobsData);
      setStatistics(statsData);
      setScrapingStatus(statusData);
      toast.success("Scan complete!", `Found ${statsData.total_jobs} jobs`);
    } catch (err) {
      logError("Failed to search jobs:", err);
      setError(getErrorMessage(err));
      toast.error("Scan failed", getErrorMessage(err));
    } finally {
      setSearching(false);
      // Set a 30-second cooldown to prevent rate limiting from job boards
      setTimeout(() => setSearchCooldown(false), 30000);
    }
  };

  const handleHideJob = async (id: number) => {
    try {
      await invoke("hide_job", { id });
      setJobs(jobs.filter((job) => job.id !== id));
      toast.success("Job hidden", "You won't see this job again");
    } catch (err) {
      logError("Failed to hide job:", err);
      toast.error("Failed to hide job", getErrorMessage(err));
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    // Use consistent date formatting with explicit options
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <LoadingSpinner message="Scanning job boards..." />;
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Header */}
      <header className="bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sentinel-500 rounded-lg flex items-center justify-center">
                <SentinelIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display text-display-md text-surface-900 dark:text-white">
                  JobSentinel
                </h1>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Privacy-first job search automation
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Status indicator */}
              <Tooltip content={scrapingStatus.is_running ? "Currently scanning job boards" : "Ready to scan"} position="bottom">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-50 dark:bg-surface-700 rounded-lg">
                  <div className={scrapingStatus.is_running ? "status-dot-active" : "status-dot-idle"} />
                  <span className="text-sm text-surface-600 dark:text-surface-300">
                    {scrapingStatus.is_running ? "Scanning..." : "Idle"}
                  </span>
                </div>
              </Tooltip>

              <ThemeToggle />

              <Tooltip content="Settings" position="bottom">
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
                  aria-label="Open settings"
                >
                  <SettingsIcon />
                </button>
              </Tooltip>

              <Button
                onClick={handleSearchNow}
                loading={searching}
                disabled={searchCooldown && !searching}
                icon={<SearchIcon />}
                aria-label={searching ? "Scanning job boards" : "Search for new jobs"}
              >
                {searchCooldown && !searching ? "Wait..." : "Search Now"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Modal with Error Boundary */}
      {showSettings && (
        <ModalErrorBoundary
          onClose={() => setShowSettings(false)}
          title="Settings Error"
        >
          <Settings onClose={() => {
            setShowSettings(false);
            fetchData(); // Refresh data after settings change
          }} />
        </ModalErrorBoundary>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-slide-up">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <ErrorIcon className="w-5 h-5 text-danger" />
              </div>
              <div>
                <p className="font-medium text-danger">Error</p>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600 dark:hover:text-red-300"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 stagger-children">
          {/* Total Jobs */}
          <Card className="relative overflow-hidden dark:bg-surface-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Total Jobs</p>
                <p className="font-display text-display-xl text-surface-900 dark:text-white">
                  {statistics.total_jobs.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-sentinel-50 dark:bg-sentinel-900/30 rounded-lg flex items-center justify-center">
                <BriefcaseIcon className="w-6 h-6 text-sentinel-500" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sentinel-400 to-sentinel-500" />
          </Card>

          {/* High Matches */}
          <Card className="relative overflow-hidden dark:bg-surface-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">High Matches</p>
                <p className="font-display text-display-xl text-alert-600 dark:text-alert-400">
                  {statistics.high_matches.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-alert-50 dark:bg-alert-900/30 rounded-lg flex items-center justify-center">
                <StarIcon className="w-6 h-6 text-alert-500" />
              </div>
            </div>
            {statistics.high_matches > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-alert-400 to-alert-500" />
            )}
          </Card>

          {/* Average Score */}
          <Card className="relative overflow-hidden dark:bg-surface-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Avg Score</p>
                <p className="font-mono text-display-xl text-surface-900 dark:text-white">
                  {Math.round(statistics.average_score * 100)}%
                </p>
              </div>
              <ScoreDisplay score={statistics.average_score} size="md" showLabel={false} animate={false} />
            </div>
          </Card>
        </div>

        {/* Scraping status */}
        <Card className="mb-8 dark:bg-surface-800">
          <CardHeader
            title="Scraping Status"
            action={
              <span className="text-sm text-surface-500 dark:text-surface-400">
                Next scan: {formatDate(scrapingStatus.next_scrape)}
              </span>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-1">Last Scan</p>
              <p className="font-medium text-surface-800 dark:text-surface-200">{formatDate(scrapingStatus.last_scrape)}</p>
            </div>
            <div>
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div className={scrapingStatus.is_running ? "status-dot-active" : "status-dot-idle"} />
                <p className="font-medium text-surface-800 dark:text-surface-200">
                  {scrapingStatus.is_running ? "Scanning job boards..." : "Idle"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-1">Sources</p>
              <p className="font-medium text-surface-800 dark:text-surface-200">Greenhouse, Lever, JobsWithGPT</p>
            </div>
          </div>
        </Card>

        {/* Jobs list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-display-lg text-surface-900 dark:text-white">
              Recent Jobs
            </h2>
            {jobs.length > 0 && (
              <span className="text-sm text-surface-500 dark:text-surface-400">
                Showing {jobs.length} jobs
              </span>
            )}
          </div>

          {jobs.length === 0 ? (
            <Card className="text-center py-12 dark:bg-surface-800">
              <div className="w-16 h-16 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <SearchIcon className="w-8 h-8 text-surface-400" />
              </div>
              <h3 className="font-display text-display-md text-surface-700 dark:text-surface-300 mb-2">
                Ready to find your next opportunity
              </h3>
              <p className="text-surface-500 dark:text-surface-400 mb-6 max-w-md mx-auto">
                Click "Search Now" to scan job boards for positions matching your preferences.
              </p>
              <Button onClick={handleSearchNow} loading={searching}>
                Start Scanning
              </Button>
              
              {/* How it works */}
              <div className="mt-8 pt-6 border-t border-surface-200 dark:border-surface-700">
                <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">How JobSentinel works:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-lg mx-auto">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-full flex items-center justify-center text-sentinel-600 dark:text-sentinel-400 font-semibold text-sm">1</div>
                    <div>
                      <p className="text-sm font-medium text-surface-700 dark:text-surface-300">We scan</p>
                      <p className="text-xs text-surface-500 dark:text-surface-400">Job boards every 2 hours</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-full flex items-center justify-center text-sentinel-600 dark:text-sentinel-400 font-semibold text-sm">2</div>
                    <div>
                      <p className="text-sm font-medium text-surface-700 dark:text-surface-300">We match</p>
                      <p className="text-xs text-surface-500 dark:text-surface-400">Based on your skills</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-full flex items-center justify-center text-sentinel-600 dark:text-sentinel-400 font-semibold text-sm">3</div>
                    <div>
                      <p className="text-sm font-medium text-surface-700 dark:text-surface-300">You apply</p>
                      <p className="text-xs text-surface-500 dark:text-surface-400">To jobs that fit you</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-3 stagger-children">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} onHideJob={handleHideJob} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Icons
function SentinelIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ErrorIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function BriefcaseIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function StarIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
