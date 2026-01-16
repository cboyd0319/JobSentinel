import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { Button, Card, CardHeader, LoadingSpinner, JobCard, ScoreDisplay, ThemeToggle, Tooltip, ModalErrorBoundary, Dropdown, Modal, ModalFooter } from "../components";
import { useToast } from "../contexts";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { getErrorMessage, logError } from "../utils/errorUtils";
import { notifyScrapingComplete } from "../utils/notifications";
import { exportJobsToCSV } from "../utils/export";
import { cachedInvoke, invalidateCacheByCommand } from "../utils/api";
import Settings from "./Settings";

type SortOption = "score-desc" | "score-asc" | "date-desc" | "date-asc" | "company-asc";
type ScoreFilter = "all" | "high" | "medium" | "low";

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
  bookmarked?: boolean;
  notes?: string | null;
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

type Page = "dashboard" | "applications" | "resume" | "salary" | "market";

interface DashboardProps {
  onNavigate?: (page: Page) => void;
  showSettings?: boolean;
  onShowSettingsChange?: (show: boolean) => void;
}

export default function Dashboard({ onNavigate, showSettings: showSettingsProp, onShowSettingsChange }: DashboardProps) {
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
  const [showSettingsLocal, setShowSettingsLocal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("score-desc");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [remoteFilter, setRemoteFilter] = useState<string>("all");
  const [bookmarkFilter, setBookmarkFilter] = useState<string>("all");
  const [notesFilter, setNotesFilter] = useState<string>("all");
  // Notes modal state
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [notesText, setNotesText] = useState("");
  const toast = useToast();

  // Use prop if provided, otherwise use local state
  const showSettings = showSettingsProp ?? showSettingsLocal;
  const setShowSettings = onShowSettingsChange ?? setShowSettingsLocal;

  // Get unique sources from jobs
  const availableSources = useMemo(() => {
    const sources = new Set(jobs.map((job) => job.source));
    return ["all", ...Array.from(sources)];
  }, [jobs]);

  // Filter and sort jobs
  const filteredAndSortedJobs = useMemo(() => {
    let result = [...jobs];

    // Apply score filter
    if (scoreFilter !== "all") {
      result = result.filter((job) => {
        if (scoreFilter === "high") return job.score >= 0.7;
        if (scoreFilter === "medium") return job.score >= 0.4 && job.score < 0.7;
        if (scoreFilter === "low") return job.score < 0.4;
        return true;
      });
    }

    // Apply source filter
    if (sourceFilter !== "all") {
      result = result.filter((job) => job.source === sourceFilter);
    }

    // Apply remote filter
    if (remoteFilter !== "all") {
      result = result.filter((job) => {
        if (remoteFilter === "remote") return job.remote === true;
        if (remoteFilter === "onsite") return job.remote === false;
        return true;
      });
    }

    // Apply bookmark filter
    if (bookmarkFilter !== "all") {
      result = result.filter((job) => {
        if (bookmarkFilter === "bookmarked") return job.bookmarked === true;
        if (bookmarkFilter === "not-bookmarked") return job.bookmarked !== true;
        return true;
      });
    }

    // Apply notes filter
    if (notesFilter !== "all") {
      result = result.filter((job) => {
        if (notesFilter === "has-notes") return !!job.notes;
        if (notesFilter === "no-notes") return !job.notes;
        return true;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "score-desc":
          return b.score - a.score;
        case "score-asc":
          return a.score - b.score;
        case "date-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "company-asc":
          return a.company.localeCompare(b.company);
        default:
          return 0;
      }
    });

    return result;
  }, [jobs, scoreFilter, sourceFilter, remoteFilter, bookmarkFilter, notesFilter, sortBy]);

  // Ref for job list container (for scrolling selected job into view)
  const jobListRef = useRef<HTMLDivElement>(null);

  // Open job URL in external browser
  const handleOpenJob = useCallback(async (job: Job) => {
    try {
      await open(job.url);
    } catch {
      window.open(job.url, "_blank", "noopener,noreferrer");
    }
  }, []);

  // Keyboard navigation for job list
  const { selectedIndex, isKeyboardActive } = useKeyboardNavigation({
    items: filteredAndSortedJobs,
    enabled: !showSettings && !loading,
    onOpen: handleOpenJob,
    onHide: (job) => handleHideJob(job.id),
  });

  // Scroll selected job into view when navigating with keyboard
  useEffect(() => {
    if (isKeyboardActive && selectedIndex >= 0 && jobListRef.current) {
      const selectedElement = jobListRef.current.querySelector(`[data-selected="true"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedIndex, isKeyboardActive]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use cached invoke with 30s TTL for stats, 10s for jobs (more dynamic)
      const [jobsData, statsData, statusData] = await Promise.all([
        cachedInvoke<Job[]>("get_recent_jobs", { limit: 50 }, 10_000),
        cachedInvoke<Statistics>("get_statistics", undefined, 30_000),
        cachedInvoke<ScrapingStatus>("get_scraping_status", undefined, 10_000),
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

      // Invalidate cache after mutation - we want fresh data
      invalidateCacheByCommand("get_recent_jobs");
      invalidateCacheByCommand("get_statistics");
      invalidateCacheByCommand("get_scraping_status");

      // Fetch fresh data (no cache, we just invalidated)
      const [jobsData, statsData, statusData] = await Promise.all([
        invoke<Job[]>("get_recent_jobs", { limit: 50 }),
        invoke<Statistics>("get_statistics"),
        invoke<ScrapingStatus>("get_scraping_status"),
      ]);
      setJobs(jobsData);
      setStatistics(statsData);
      setScrapingStatus(statusData);
      toast.success("Scan complete!", `Found ${statsData.total_jobs} jobs`);

      // Send desktop notification for high matches
      const newHighMatches = statsData.high_matches;
      if (newHighMatches > 0) {
        notifyScrapingComplete(jobsData.length, newHighMatches);
      }
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
      // Invalidate cache since job list changed
      invalidateCacheByCommand("get_recent_jobs");
      invalidateCacheByCommand("get_statistics");
      setJobs(jobs.filter((job) => job.id !== id));
      toast.success("Job hidden", "You won't see this job again");
    } catch (err) {
      logError("Failed to hide job:", err);
      toast.error("Failed to hide job", getErrorMessage(err));
    }
  };

  const handleToggleBookmark = async (id: number) => {
    try {
      const newState = await invoke<boolean>("toggle_bookmark", { id });
      // Update local state optimistically
      setJobs(jobs.map((job) =>
        job.id === id ? { ...job, bookmarked: newState } : job
      ));
      toast.success(
        newState ? "Bookmarked" : "Removed bookmark",
        newState ? "Job saved to favorites" : "Job removed from favorites"
      );
    } catch (err) {
      logError("Failed to toggle bookmark:", err);
      toast.error("Failed to update bookmark", getErrorMessage(err));
    }
  };

  const handleEditNotes = (id: number, currentNotes?: string | null) => {
    setEditingJobId(id);
    setNotesText(currentNotes || "");
    setNotesModalOpen(true);
  };

  const handleSaveNotes = async () => {
    if (editingJobId === null) return;
    try {
      const notesToSave = notesText.trim() || null;
      await invoke("set_job_notes", { id: editingJobId, notes: notesToSave });
      // Update local state
      setJobs(jobs.map((job) =>
        job.id === editingJobId ? { ...job, notes: notesToSave } : job
      ));
      toast.success("Notes saved", notesToSave ? "Your notes have been saved" : "Notes removed");
      setNotesModalOpen(false);
      setEditingJobId(null);
      setNotesText("");
    } catch (err) {
      logError("Failed to save notes:", err);
      toast.error("Failed to save notes", getErrorMessage(err));
    }
  };

  const handleCloseNotesModal = () => {
    setNotesModalOpen(false);
    setEditingJobId(null);
    setNotesText("");
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

              <div data-tour="theme-toggle">
                <ThemeToggle />
              </div>

              <Tooltip content="Settings" position="bottom">
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
                  aria-label="Open settings"
                  data-tour="settings-button"
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
                data-tour="search-button"
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

        {/* Quick Navigation */}
        {onNavigate && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-tour="quick-nav">
            <button
              onClick={() => onNavigate("applications")}
              className="flex items-center gap-3 p-4 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-sentinel-300 dark:hover:border-sentinel-600 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <KanbanIcon className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-surface-800 dark:text-surface-200 group-hover:text-sentinel-600 dark:group-hover:text-sentinel-400">Applications</p>
                <p className="text-xs text-surface-500 dark:text-surface-400">Track your pipeline</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate("resume")}
              className="flex items-center gap-3 p-4 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-sentinel-300 dark:hover:border-sentinel-600 transition-colors group"
            >
              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <DocumentIcon className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-surface-800 dark:text-surface-200 group-hover:text-sentinel-600 dark:group-hover:text-sentinel-400">Resume</p>
                <p className="text-xs text-surface-500 dark:text-surface-400">AI matching</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate("salary")}
              className="flex items-center gap-3 p-4 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-sentinel-300 dark:hover:border-sentinel-600 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CurrencyIcon className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-surface-800 dark:text-surface-200 group-hover:text-sentinel-600 dark:group-hover:text-sentinel-400">Salary AI</p>
                <p className="text-xs text-surface-500 dark:text-surface-400">Benchmarks & negotiation</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate("market")}
              className="flex items-center gap-3 p-4 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-sentinel-300 dark:hover:border-sentinel-600 transition-colors group"
            >
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <ChartIcon className="w-5 h-5 text-orange-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-surface-800 dark:text-surface-200 group-hover:text-sentinel-600 dark:group-hover:text-sentinel-400">Market Intel</p>
                <p className="text-xs text-surface-500 dark:text-surface-400">Trends & insights</p>
              </div>
            </button>
          </div>
        )}

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
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-display-lg text-surface-900 dark:text-white">
                  Recent Jobs
                </h2>
                {/* Keyboard shortcut hint */}
                {jobs.length > 0 && (
                  <Tooltip content="Navigate: j/k, Open: o/Enter, Hide: h" position="right">
                    <span className="text-xs text-surface-400 dark:text-surface-500 px-2 py-1 bg-surface-100 dark:bg-surface-700 rounded">
                      <KeyboardIcon className="w-3 h-3 inline mr-1" />
                      j/k/o/h
                    </span>
                  </Tooltip>
                )}
              </div>
              {jobs.length > 0 && (
                <span className="text-sm text-surface-500 dark:text-surface-400">
                  Showing {filteredAndSortedJobs.length} of {jobs.length} jobs
                </span>
              )}
            </div>

            {/* Filter and Sort Controls */}
            {jobs.length > 0 && (
              <div className="flex flex-wrap items-center gap-3" data-tour="job-filters">
                {/* Sort */}
                <Dropdown
                  label="Sort"
                  value={sortBy}
                  onChange={(value) => setSortBy(value as SortOption)}
                  options={[
                    { value: "score-desc", label: "Score (High → Low)" },
                    { value: "score-asc", label: "Score (Low → High)" },
                    { value: "date-desc", label: "Date (Newest)" },
                    { value: "date-asc", label: "Date (Oldest)" },
                    { value: "company-asc", label: "Company (A-Z)" },
                  ]}
                />

                {/* Score Filter */}
                <Dropdown
                  label="Score"
                  value={scoreFilter}
                  onChange={(value) => setScoreFilter(value as ScoreFilter)}
                  options={[
                    { value: "all", label: "All Scores" },
                    { value: "high", label: "High (70%+)" },
                    { value: "medium", label: "Medium (40-69%)" },
                    { value: "low", label: "Low (<40%)" },
                  ]}
                />

                {/* Source Filter */}
                <Dropdown
                  label="Source"
                  value={sourceFilter}
                  onChange={setSourceFilter}
                  options={availableSources.map((source) => ({
                    value: source,
                    label: source === "all" ? "All Sources" : source,
                  }))}
                />

                {/* Remote Filter */}
                <Dropdown
                  label="Location"
                  value={remoteFilter}
                  onChange={setRemoteFilter}
                  options={[
                    { value: "all", label: "All Locations" },
                    { value: "remote", label: "Remote Only" },
                    { value: "onsite", label: "On-site Only" },
                  ]}
                />

                {/* Bookmark Filter */}
                <Dropdown
                  label="Saved"
                  value={bookmarkFilter}
                  onChange={setBookmarkFilter}
                  options={[
                    { value: "all", label: "All Jobs" },
                    { value: "bookmarked", label: "Bookmarked" },
                    { value: "not-bookmarked", label: "Not Bookmarked" },
                  ]}
                />

                {/* Notes Filter */}
                <Dropdown
                  label="Notes"
                  value={notesFilter}
                  onChange={setNotesFilter}
                  options={[
                    { value: "all", label: "All Jobs" },
                    { value: "has-notes", label: "With Notes" },
                    { value: "no-notes", label: "No Notes" },
                  ]}
                />

                {/* Clear filters */}
                {(scoreFilter !== "all" || sourceFilter !== "all" || remoteFilter !== "all" || bookmarkFilter !== "all" || notesFilter !== "all") && (
                  <button
                    onClick={() => {
                      setScoreFilter("all");
                      setSourceFilter("all");
                      setRemoteFilter("all");
                      setBookmarkFilter("all");
                      setNotesFilter("all");
                    }}
                    className="text-sm text-sentinel-600 dark:text-sentinel-400 hover:underline"
                  >
                    Clear filters
                  </button>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Export button */}
                <Tooltip content="Export jobs to CSV" position="bottom">
                  <button
                    onClick={() => exportJobsToCSV(filteredAndSortedJobs)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors"
                    aria-label="Export jobs to CSV"
                  >
                    <ExportIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </Tooltip>
              </div>
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
          ) : filteredAndSortedJobs.length === 0 ? (
            <Card className="text-center py-8 dark:bg-surface-800">
              <div className="w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <FilterIcon className="w-6 h-6 text-surface-400" />
              </div>
              <h3 className="font-medium text-surface-700 dark:text-surface-300 mb-2">
                No jobs match your filters
              </h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
                Try adjusting your filter criteria to see more results.
              </p>
              <button
                onClick={() => {
                  setScoreFilter("all");
                  setSourceFilter("all");
                  setRemoteFilter("all");
                }}
                className="text-sm text-sentinel-600 dark:text-sentinel-400 hover:underline"
              >
                Clear all filters
              </button>
            </Card>
          ) : (
            <div ref={jobListRef} className="space-y-3 stagger-children">
              {filteredAndSortedJobs.map((job, index) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onHideJob={handleHideJob}
                  onToggleBookmark={handleToggleBookmark}
                  onEditNotes={handleEditNotes}
                  isSelected={isKeyboardActive && index === selectedIndex}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Notes Modal */}
      <Modal
        isOpen={notesModalOpen}
        onClose={handleCloseNotesModal}
        title="Edit Notes"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Add personal notes about this job. Notes are only visible to you.
          </p>
          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Interview prep, company research, questions to ask..."
            className="w-full h-32 px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-sentinel-500 focus:ring-1 focus:ring-sentinel-500 dark:focus:border-sentinel-400 dark:focus:ring-sentinel-400 resize-none"
            autoFocus
          />
          <ModalFooter>
            <Button variant="secondary" onClick={handleCloseNotesModal}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes}>
              {notesText.trim() ? "Save Notes" : "Remove Notes"}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
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

function FilterIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function ExportIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
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

function KanbanIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function DocumentIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CurrencyIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChartIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function KeyboardIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );
}
