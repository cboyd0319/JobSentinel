import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Card, CardHeader, LoadingSpinner, JobCard, ScoreDisplay, ThemeToggle, Tooltip } from "../components";
import { useToast } from "../contexts";
import { getErrorMessage, logError } from "../utils/errorUtils";

interface Job {
  id: number;
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string;
  score: number;
  discovered_at: string;
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

  const handleSearchNow = async () => {
    try {
      setSearching(true);
      setError(null);
      toast.info("Scanning job boards...", "This may take a moment");
      await invoke("search_jobs");
      await fetchData();
      toast.success("Scan complete!", `Found ${jobs.length} jobs`);
    } catch (err) {
      logError("Failed to search jobs:", err);
      setError(getErrorMessage(err));
      toast.error("Scan failed", getErrorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    return date.toLocaleString();
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
              <Tooltip content={scrapingStatus.is_running ? "Currently scanning job boards" : "Ready to scan"}>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-50 dark:bg-surface-700 rounded-lg">
                  <div className={scrapingStatus.is_running ? "status-dot-active" : "status-dot-idle"} />
                  <span className="text-sm text-surface-600 dark:text-surface-300">
                    {scrapingStatus.is_running ? "Scanning..." : "Idle"}
                  </span>
                </div>
              </Tooltip>

              <ThemeToggle />

              <Button
                onClick={handleSearchNow}
                loading={searching}
                icon={<SearchIcon />}
              >
                Search Now
              </Button>
            </div>
          </div>
        </div>
      </header>

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
              <p className="font-medium text-surface-800 dark:text-surface-200">Greenhouse, Lever, LinkedIn</p>
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
                No jobs found yet
              </h3>
              <p className="text-surface-500 dark:text-surface-400 mb-6 max-w-md mx-auto">
                Click "Search Now" to start scanning job boards for opportunities matching your preferences.
              </p>
              <Button onClick={handleSearchNow} loading={searching}>
                Start Scanning
              </Button>
            </Card>
          ) : (
            <div className="space-y-3 stagger-children">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ErrorIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function BriefcaseIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function StarIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}
