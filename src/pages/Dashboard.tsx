// Dashboard - Main job search interface
// Refactored for v1.5 modularization - uses extracted hooks and components

import { useEffect, useState, useCallback, useRef, useId, lazy, Suspense } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import { Button } from "../components/Button";
import { Card, CardHeader } from "../components/Card";
import { JobCard } from "../components/JobCard";
import { ScoreDisplay } from "../components/ScoreDisplay";
import { Modal, ModalFooter } from "../components/Modal";
import { default as ModalErrorBoundary } from "../components/ModalErrorBoundary";
import { FocusTrap } from "../components/FocusTrap";
import { DashboardSkeleton } from "../components/Skeleton";
import { useToast } from "../contexts";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { getErrorMessage, logError } from "../utils/errorUtils";
import { SCORE_THRESHOLD_GOOD } from "../utils/constants";
import { notifyScrapingComplete } from "../utils/notifications";
import { cachedInvoke, invalidateCacheByCommand, safeInvoke } from "../utils/api";
import { PanelSkeleton, WidgetSkeleton } from "../components/LoadingFallbacks";

// Lazy load heavy components to reduce initial bundle size
const DashboardWidgets = lazy(() => import("../components/DashboardWidgets").then(m => ({ default: m.DashboardWidgets })));
const CompanyResearchPanel = lazy(() => import("../components/CompanyResearchPanel").then(m => ({ default: m.CompanyResearchPanel })));
const Settings = lazy(() => import("./Settings"));

// Extracted modules
import type { Job, Statistics, ScrapingStatus, DuplicateGroup, DashboardProps, AutoRefreshConfig, SavedSearch } from "./DashboardTypes";
import { FilterIcon, TrashIcon, CheckCircleIcon, BriefcaseIcon } from "./DashboardIcons";
import { useDashboardFilters } from "./hooks/useDashboardFilters";
import { useDashboardSearch } from "./hooks/useDashboardSearch";
import { useDashboardJobOps } from "./hooks/useDashboardJobOps";
import { useDashboardSavedSearches } from "./hooks/useDashboardSavedSearches";
import { useDashboardAutoRefresh } from "./hooks/useDashboardAutoRefresh";
import { DashboardHeader, DashboardStats, DashboardFiltersBar, QuickActions } from "./DashboardUI";

export default function Dashboard({ onNavigate: _onNavigate, showSettings: showSettingsProp, onShowSettingsChange }: DashboardProps) {
  // Core state
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
  const [searchCooldown, setSearchCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [researchCompany, setResearchCompany] = useState<string | null>(null);

  const toast = useToast();

  // Use prop if provided, otherwise use local state
  const showSettings = showSettingsProp ?? showSettingsLocal;
  const setShowSettings = onShowSettingsChange ?? setShowSettingsLocal;

  // Refs
  const jobListRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null!);

  // Accessibility IDs (SSR-safe)
  const saveSearchNameId = useId();
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable callback for data updates
  const handleDataUpdate = useCallback((data: { jobs: Job[]; stats: Statistics; status: ScrapingStatus }) => {
    setJobs(data.jobs);
    setStatistics(data.stats);
    setScrapingStatus(data.status);
  }, []);

  // Extracted hooks
  const filters = useDashboardFilters(jobs);
  const { searchHistory, addToSearchHistory, clearSearchHistory, showSearchHistory, setShowSearchHistory } = useDashboardSearch();
  const jobOps = useDashboardJobOps(jobs, setJobs);
  const savedSearches = useDashboardSavedSearches();

  // Auto-refresh hook
  const autoRefresh = useDashboardAutoRefresh({
    searching,
    showSettings,
    statistics,
    onDataUpdate: handleDataUpdate,
  });

  // Data fetching
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [jobsData, statsData, statusData] = await Promise.all([
        cachedInvoke<Job[]>("get_recent_jobs", { limit: 50 }, 10_000),
        cachedInvoke<Statistics>("get_statistics", undefined, 30_000),
        cachedInvoke<ScrapingStatus>("get_scraping_status", undefined, 10_000),
      ]);

      setJobs(jobsData);
      setStatistics(statsData);
      setScrapingStatus(statusData);

      // Load auto-refresh config
      try {
        const config = await cachedInvoke<{ auto_refresh?: AutoRefreshConfig }>("get_config", undefined, 60_000);
        if (config?.auto_refresh) {
          autoRefresh.setAutoRefreshEnabled(config.auto_refresh.enabled);
          autoRefresh.setAutoRefreshInterval(config.auto_refresh.interval_minutes || 30);
        }
      } catch {
        // Config might not have auto_refresh yet, use defaults
      }
    } catch (err) {
      logError("Failed to fetch dashboard data:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [autoRefresh]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for jobs-updated event from Tauri backend
  useEffect(() => {
    const unlisten = listen<{ jobs_found: number; jobs_new: number }>("jobs-updated", (event) => {
      const { jobs_new } = event.payload;
      if (jobs_new > 0) {
        toast.success("New jobs found!", `${jobs_new} new job${jobs_new > 1 ? "s" : ""} added`);
        // Invalidate cache and refresh data
        invalidateCacheByCommand("get_recent_jobs");
        invalidateCacheByCommand("get_statistics");
        fetchData();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [fetchData, toast]);

  // One-time fallback refresh for initial load
  useEffect(() => {
    if (autoRefresh.autoRefreshEnabled) return;

    const initialRefresh = setTimeout(() => {
      if (jobs.length === 0) {
        fetchData();
      }
    }, 30000);

    return () => clearTimeout(initialRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh.autoRefreshEnabled]);

  // Cleanup cooldown timers on unmount
  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
    };
  }, []);

  // Manual search
  const handleSearchNow = async () => {
    if (searchCooldown) {
      toast.info("Please wait", `Search available in ${cooldownSeconds} seconds`);
      return;
    }

    try {
      setSearching(true);
      setSearchCooldown(true);
      setCooldownSeconds(30);
      setError(null);
      toast.info("Scanning job boards...", "This may take a moment");

      // Clear any existing timers
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);

      // Start countdown timer
      cooldownIntervalRef.current = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            if (cooldownIntervalRef.current) {
              clearInterval(cooldownIntervalRef.current);
              cooldownIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      await safeInvoke("search_jobs", undefined, { logContext: "Manual job search" });

      invalidateCacheByCommand("get_recent_jobs");
      invalidateCacheByCommand("get_statistics");
      invalidateCacheByCommand("get_scraping_status");

      const [jobsData, statsData, statusData] = await Promise.all([
        safeInvoke<Job[]>("get_recent_jobs", { limit: 50 }),
        safeInvoke<Statistics>("get_statistics"),
        safeInvoke<ScrapingStatus>("get_scraping_status"),
      ]);
      setJobs(jobsData);
      setStatistics(statsData);
      setScrapingStatus(statusData);
      toast.success("Scan complete!", `Found ${statsData.total_jobs} jobs`);

      if (statsData.high_matches > 0) {
        notifyScrapingComplete(jobsData.length, statsData.high_matches);
      }

      // Clear cooldown after 30 seconds from start
      cooldownTimeoutRef.current = setTimeout(() => {
        setSearchCooldown(false);
        setCooldownSeconds(0);
        cooldownTimeoutRef.current = null;
      }, 30000);
    } catch (err) {
      const enhancedError = err as Error & {
        userFriendly?: { title: string; message: string; action?: string };
      };
      setError(enhancedError.userFriendly?.message || getErrorMessage(err));
      toast.error(
        enhancedError.userFriendly?.title || "Job Search Failed",
        enhancedError.userFriendly?.action
          ? `${enhancedError.userFriendly.message}\n\n${enhancedError.userFriendly.action}`
          : enhancedError.userFriendly?.message ||
            "Couldn't scan for jobs. Check your internet connection and job board settings, then try again."
      );
      // Reset cooldown on error so user can retry
      setSearchCooldown(false);
      setCooldownSeconds(0);
    } finally {
      setSearching(false);
    }
  };

  // Open job URL
  const handleOpenJob = useCallback(async (job: Job) => {
    try {
      await open(job.url);
    } catch {
      window.open(job.url, "_blank", "noopener,noreferrer");
    }
  }, []);

  // Keyboard navigation
  const { selectedIndex, isKeyboardActive } = useKeyboardNavigation({
    items: filters.filteredAndSortedJobs,
    enabled: !showSettings && !loading && !jobOps.notesModalOpen,
    onOpen: handleOpenJob,
    onHide: (job) => jobOps.handleHideJob(job.id),
    onBookmark: (job) => jobOps.handleToggleBookmark(job.id),
    onNotes: (job) => jobOps.handleEditNotes(job.id, job.notes),
    onResearch: (job) => setResearchCompany(job.company),
    onToggleSelect: (job) => {
      jobOps.setSelectedJobIds((prev) => {
        const next = new Set(prev);
        if (next.has(job.id)) {
          next.delete(job.id);
        } else {
          next.add(job.id);
        }
        return next;
      });
      jobOps.setBulkMode(true);
    },
    onFocusSearch: () => searchInputRef.current?.focus(),
    onRefresh: () => handleSearchNow(),
  });

  // Scroll selected job into view
  useEffect(() => {
    if (isKeyboardActive && selectedIndex >= 0 && jobListRef.current) {
      const selectedElement = jobListRef.current.querySelector(`[data-selected="true"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedIndex, isKeyboardActive]);

  // Memoized callbacks for QuickActions and DashboardFiltersBar
  const handleExportHighMatches = useCallback(() => {
    const highMatchJobs = jobs.filter(j => j.score >= SCORE_THRESHOLD_GOOD);
    jobOps.handleBulkExport(highMatchJobs);
  }, [jobs, jobOps]);

  const handleShowHighMatchesOnly = useCallback(() => {
    filters.setScoreFilter("high");
  }, [filters]);

  const handleShowRemoteOnly = useCallback(() => {
    filters.setRemoteFilter("remote");
  }, [filters]);

  const handleExportFilteredJobs = useCallback(() => {
    jobOps.handleBulkExport(filters.filteredAndSortedJobs);
  }, [jobOps, filters.filteredAndSortedJobs]);

  const handleLoadSearch = useCallback((search: SavedSearch) => {
    savedSearches.handleLoadSearch(search, filters.loadFilters);
  }, [savedSearches, filters.loadFilters]);

  const handleSelectAllJobs = useCallback(() => {
    jobOps.selectAllJobs(filters.filteredAndSortedJobs);
  }, [jobOps, filters.filteredAndSortedJobs]);

  const handleExportSelectedJobs = useCallback(() => {
    jobOps.handleBulkExport(filters.filteredAndSortedJobs.filter(j => jobOps.selectedJobIds.has(j.id)));
  }, [jobOps, filters.filteredAndSortedJobs]);

  // Settings modal
  if (showSettings) {
    return (
      <ModalErrorBoundary onClose={() => setShowSettings(false)}>
        <Suspense fallback={<PanelSkeleton />}>
          <Settings onClose={() => setShowSettings(false)} />
        </Suspense>
      </ModalErrorBoundary>
    );
  }

  // Loading state - use skeleton for better perceived performance
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center p-4">
        <Card className="max-w-md text-center py-8 dark:bg-surface-800">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 dark:text-red-400 text-xl">!</span>
          </div>
          <h2 className="font-display text-display-md text-surface-900 dark:text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-surface-500 dark:text-surface-400 mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      <DashboardHeader
        scrapingStatus={scrapingStatus}
        autoRefreshEnabled={autoRefresh.autoRefreshEnabled}
        nextRefreshTime={autoRefresh.nextRefreshTime}
        formatTimeUntil={autoRefresh.formatTimeUntil}
        searching={searching}
        searchCooldown={searchCooldown}
        cooldownSeconds={cooldownSeconds}
        onSearchNow={handleSearchNow}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <DashboardStats statistics={statistics} />

        {/* Analytics Widgets (collapsible, lazy-loaded) */}
        <Suspense fallback={<WidgetSkeleton />}>
          <DashboardWidgets className="mb-6" />
        </Suspense>

        {/* Quick Actions */}
        <QuickActions
          totalJobs={statistics.total_jobs}
          highMatches={statistics.high_matches}
          filteredCount={filters.filteredAndSortedJobs.length}
          onExportHighMatches={handleExportHighMatches}
          onShowHighMatchesOnly={handleShowHighMatchesOnly}
          onShowRemoteOnly={handleShowRemoteOnly}
          onClearFilters={filters.clearFilters}
          hasActiveFilters={!!filters.hasActiveFilters}
        />

        <section className="mt-4">
          <DashboardFiltersBar
            jobs={jobs}
            filteredJobs={filters.filteredAndSortedJobs}
            textSearch={filters.textSearch}
            setTextSearch={filters.setTextSearch}
            searchInputRef={searchInputRef}
            showSearchHistory={showSearchHistory}
            setShowSearchHistory={setShowSearchHistory}
            searchHistory={searchHistory}
            addToSearchHistory={addToSearchHistory}
            clearSearchHistory={clearSearchHistory}
            sortBy={filters.sortBy}
            setSortBy={filters.setSortBy}
            scoreFilter={filters.scoreFilter}
            setScoreFilter={filters.setScoreFilter}
            sourceFilter={filters.sourceFilter}
            setSourceFilter={filters.setSourceFilter}
            availableSources={filters.availableSources}
            remoteFilter={filters.remoteFilter}
            setRemoteFilter={filters.setRemoteFilter}
            bookmarkFilter={filters.bookmarkFilter}
            setBookmarkFilter={filters.setBookmarkFilter}
            notesFilter={filters.notesFilter}
            setNotesFilter={filters.setNotesFilter}
            ghostFilter={filters.ghostFilter}
            setGhostFilter={filters.setGhostFilter}
            postedDateFilter={filters.postedDateFilter}
            setPostedDateFilter={filters.setPostedDateFilter}
            salaryMinFilter={filters.salaryMinFilter}
            setSalaryMinFilter={filters.setSalaryMinFilter}
            salaryMaxFilter={filters.salaryMaxFilter}
            setSalaryMaxFilter={filters.setSalaryMaxFilter}
            hasActiveFilters={!!filters.hasActiveFilters}
            clearFilters={filters.clearFilters}
            checkingDuplicates={jobOps.checkingDuplicates}
            handleCheckDuplicates={jobOps.handleCheckDuplicates}
            bulkMode={jobOps.bulkMode}
            toggleBulkMode={jobOps.toggleBulkMode}
            onExportJobs={handleExportFilteredJobs}
            onOpenSaveSearch={() => savedSearches.setSaveSearchModalOpen(true)}
            savedSearches={savedSearches.savedSearches}
            onLoadSearch={handleLoadSearch}
            selectedJobIds={jobOps.selectedJobIds}
            selectAllJobs={handleSelectAllJobs}
            clearSelection={jobOps.clearSelection}
            handleBulkExport={handleExportSelectedJobs}
            handleCompareJobs={jobOps.handleCompareJobs}
            handleBulkBookmark={jobOps.handleBulkBookmark}
            handleBulkHide={jobOps.handleBulkHide}
          />

          {/* Job List */}
          {jobs.length === 0 ? (
            <Card className="text-center py-12 dark:bg-surface-800" data-tour="job-list">
              <div className="w-12 h-12 bg-sentinel-50 dark:bg-sentinel-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BriefcaseIcon className="w-6 h-6 text-sentinel-400" />
              </div>
              <CardHeader title="No jobs yet" subtitle="Start by searching for jobs" />
              <Button onClick={handleSearchNow} loading={searching} className="mt-4">
                Search Now
              </Button>
              <div className="mt-8 pt-6 border-t border-surface-200 dark:border-surface-700">
                <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">How JobSentinel works:</p>
                <div className="flex flex-col gap-4 max-w-xs mx-auto text-left">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-full flex items-center justify-center text-sentinel-600 dark:text-sentinel-400 font-semibold text-sm">1</div>
                    <div>
                      <p className="text-sm font-medium text-surface-700 dark:text-surface-300">We search</p>
                      <p className="text-xs text-surface-500 dark:text-surface-400">13 job boards automatically</p>
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
          ) : filters.filteredAndSortedJobs.length === 0 ? (
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
                onClick={filters.clearFilters}
                className="text-sm text-sentinel-600 dark:text-sentinel-400 hover:underline"
              >
                Clear all filters
              </button>
            </Card>
          ) : (
            <div ref={jobListRef} className="space-y-3 stagger-children" data-testid="job-list">
              {filters.filteredAndSortedJobs.map((job, index) => (
                <div key={job.id} className="flex items-start gap-3">
                  {jobOps.bulkMode && (
                    <div className="flex-shrink-0 pt-5">
                      <input
                        type="checkbox"
                        checked={jobOps.selectedJobIds.has(job.id)}
                        onChange={() => jobOps.toggleJobSelection(job.id)}
                        className="w-5 h-5 rounded border-surface-300 dark:border-surface-600 text-sentinel-500 focus:ring-sentinel-500"
                        aria-label={`Select ${job.title}`}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <JobCard
                      job={job}
                      onHideJob={jobOps.bulkMode ? undefined : jobOps.handleHideJob}
                      onToggleBookmark={jobOps.bulkMode ? undefined : jobOps.handleToggleBookmark}
                      onEditNotes={jobOps.bulkMode ? undefined : jobOps.handleEditNotes}
                      onResearchCompany={jobOps.bulkMode ? undefined : setResearchCompany}
                      isSelected={isKeyboardActive && index === selectedIndex}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Notes Modal */}
      <Modal isOpen={jobOps.notesModalOpen} onClose={jobOps.handleCloseNotesModal} title="Edit Notes">
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Add personal notes about this job. Notes are only visible to you.
          </p>
          <textarea
            value={jobOps.notesText}
            onChange={(e) => jobOps.setNotesText(e.target.value)}
            placeholder="Interview prep, company research, questions to ask..."
            className="w-full h-32 px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-sentinel-500 focus:ring-1 focus:ring-sentinel-500 dark:focus:border-sentinel-400 dark:focus:ring-sentinel-400 resize-none"
            autoFocus
          />
          <ModalFooter>
            <Button variant="secondary" onClick={jobOps.handleCloseNotesModal}>Cancel</Button>
            <Button onClick={jobOps.handleSaveNotes}>
              {jobOps.notesText.trim() ? "Save Notes" : "Remove Notes"}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Save Search Modal */}
      <Modal
        isOpen={savedSearches.saveSearchModalOpen}
        onClose={() => {
          savedSearches.setSaveSearchModalOpen(false);
          savedSearches.setNewSearchName("");
        }}
        title="Save Current Filters"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Save your current filter settings to quickly apply them later.
          </p>
          <div>
            <label htmlFor={saveSearchNameId} className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Name
            </label>
            <input
              id={saveSearchNameId}
              type="text"
              value={savedSearches.newSearchName}
              onChange={(e) => savedSearches.setNewSearchName(e.target.value)}
              placeholder="e.g., Remote Rust Jobs"
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-sentinel-500 focus:ring-1 focus:ring-sentinel-500 dark:focus:border-sentinel-400 dark:focus:ring-sentinel-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") savedSearches.handleSaveSearch(filters.getCurrentFilters);
              }}
            />
          </div>
          <div className="text-xs text-surface-500 dark:text-surface-400">
            <p className="font-medium mb-1">Current filters:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Sort: {filters.sortBy}</li>
              {filters.scoreFilter !== "all" && <li>Score: {filters.scoreFilter}</li>}
              {filters.sourceFilter !== "all" && <li>Source: {filters.sourceFilter}</li>}
              {filters.remoteFilter !== "all" && <li>Location: {filters.remoteFilter}</li>}
              {filters.bookmarkFilter !== "all" && <li>Saved: {filters.bookmarkFilter}</li>}
              {filters.notesFilter !== "all" && <li>Notes: {filters.notesFilter}</li>}
              {filters.postedDateFilter !== "all" && <li>Posted: {filters.postedDateFilter === "24h" ? "Last 24 hours" : filters.postedDateFilter === "7d" ? "Last 7 days" : "Last 30 days"}</li>}
              {filters.salaryMinFilter !== null && <li>Min salary: ${filters.salaryMinFilter}K</li>}
              {filters.salaryMaxFilter !== null && <li>Max salary: ${filters.salaryMaxFilter}K</li>}
            </ul>
          </div>
          {savedSearches.savedSearches.length > 0 && (
            <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
                Saved searches ({savedSearches.savedSearches.length})
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {savedSearches.savedSearches.map((search) => (
                  <div key={search.id} className="flex items-center justify-between px-2 py-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 group">
                    <button
                      onClick={() => {
                        savedSearches.handleLoadSearch(search, filters.loadFilters);
                        savedSearches.setSaveSearchModalOpen(false);
                      }}
                      className="text-sm text-surface-600 dark:text-surface-300 hover:text-sentinel-600 dark:hover:text-sentinel-400 text-left flex-1"
                    >
                      {search.name}
                    </button>
                    <button
                      onClick={() => savedSearches.handleDeleteSearch(search.id)}
                      className="p-1 text-surface-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Delete "${search.name}"`}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <ModalFooter>
            <Button variant="secondary" onClick={() => {
              savedSearches.setSaveSearchModalOpen(false);
              savedSearches.setNewSearchName("");
            }}>
              Cancel
            </Button>
            <Button onClick={() => savedSearches.handleSaveSearch(filters.getCurrentFilters)} disabled={!savedSearches.newSearchName.trim()}>
              Save
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Duplicates Modal */}
      <Modal isOpen={jobOps.duplicatesModalOpen} onClose={() => jobOps.setDuplicatesModalOpen(false)} title="Duplicate Jobs">
        <div className="space-y-4">
          {jobOps.duplicateGroups.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-surface-600 dark:text-surface-400">
                No duplicate jobs found. All jobs are unique!
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-surface-600 dark:text-surface-400">
                Found {jobOps.duplicateGroups.length} duplicate groups. Same job from multiple sources.
                Merging will keep the highest-scoring version and hide duplicates.
              </p>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {jobOps.duplicateGroups.map((group) => (
                  <DuplicateGroupCard
                    key={group.primary_id}
                    group={group}
                    onMerge={jobOps.handleMergeDuplicates}
                  />
                ))}
              </div>
              <ModalFooter>
                <Button variant="secondary" onClick={() => jobOps.setDuplicatesModalOpen(false)}>Close</Button>
                <Button onClick={() => jobOps.handleMergeAllDuplicates(fetchData)}>
                  Merge All ({jobOps.duplicateGroups.length})
                </Button>
              </ModalFooter>
            </>
          )}
        </div>
      </Modal>

      {/* Job Comparison Modal */}
      <Modal isOpen={jobOps.compareModalOpen} onClose={() => jobOps.setCompareModalOpen(false)} title="Compare Jobs" size="xl">
        <div className="space-y-4">
          {jobOps.comparedJobs.length > 0 && (
            <>
              <div className={`grid gap-4 ${jobOps.comparedJobs.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                {jobOps.comparedJobs.map((job) => (
                  <div key={job.id} className="p-4 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600">
                    <h4 className="font-semibold text-surface-800 dark:text-surface-200 truncate">{job.title}</h4>
                    <p className="text-sm text-surface-500 dark:text-surface-400 truncate">{job.company}</p>
                    <ScoreDisplay score={job.score} size="sm" showLabel={false} />
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="table" aria-label="Job comparison">
                  <thead className="sr-only">
                    <tr>
                      <th scope="col">Attribute</th>
                      {jobOps.comparedJobs.map((job) => (
                        <th key={job.id} scope="col">{job.title} at {job.company}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                    <CompareRow label="Match Score" values={jobOps.comparedJobs.map((j) => `${Math.round(j.score * 100)}%`)} />
                    <CompareRow label="Location" values={jobOps.comparedJobs.map((j) => j.remote ? "Remote" : j.location || "N/A")} />
                    <CompareRow
                      label="Salary"
                      values={jobOps.comparedJobs.map((j) => {
                        if (!j.salary_min && !j.salary_max) return "Not listed";
                        const min = j.salary_min ? `$${Math.round(j.salary_min / 1000)}k` : "";
                        const max = j.salary_max ? `$${Math.round(j.salary_max / 1000)}k` : "";
                        if (min && max) return `${min} - ${max}`;
                        return min || `Up to ${max}`;
                      })}
                    />
                    <CompareRow label="Source" values={jobOps.comparedJobs.map((j) => j.source)} />
                    <CompareRow label="Remote" values={jobOps.comparedJobs.map((j) => j.remote ? "Yes" : j.remote === false ? "No" : "Unknown")} />
                    <CompareRow label="Posted" values={jobOps.comparedJobs.map((j) => new Date(j.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }))} />
                    <CompareRow label="Bookmarked" values={jobOps.comparedJobs.map((j) => j.bookmarked ? "Yes" : "No")} />
                  </tbody>
                </table>
              </div>
              <div className="pt-4 border-t border-surface-200 dark:border-surface-700">
                <h5 className="font-medium text-surface-800 dark:text-surface-200 mb-3">Descriptions</h5>
                <div className={`grid gap-4 ${jobOps.comparedJobs.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {jobOps.comparedJobs.map((job) => (
                    <div key={job.id} className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg text-xs text-surface-600 dark:text-surface-400 max-h-40 overflow-y-auto">
                      {job.description || "No description available"}
                    </div>
                  ))}
                </div>
              </div>
              <ModalFooter>
                <Button variant="secondary" onClick={() => jobOps.setCompareModalOpen(false)}>Close</Button>
              </ModalFooter>
            </>
          )}
        </div>
      </Modal>

      {/* Company Research Modal */}
      {researchCompany && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setResearchCompany(null); }}
          onKeyDown={(e) => { if (e.key === "Escape") setResearchCompany(null); }}
          role="dialog"
          aria-modal="true"
          aria-label={`Company research for ${researchCompany}`}
        >
          <FocusTrap>
            <Suspense fallback={<PanelSkeleton />}>
              <CompanyResearchPanel companyName={researchCompany} onClose={() => setResearchCompany(null)} />
            </Suspense>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}

// Helper component for duplicate groups
function DuplicateGroupCard({ group, onMerge }: { group: DuplicateGroup; onMerge: (primaryId: number, jobIds: number[]) => void }) {
  return (
    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-surface-800 dark:text-surface-200">{group.jobs[0].title}</h4>
          <p className="text-sm text-surface-500 dark:text-surface-400">{group.jobs[0].company}</p>
        </div>
        <button
          onClick={() => onMerge(group.primary_id, group.jobs.map((j) => j.id))}
          className="px-3 py-1 text-sm bg-sentinel-500 text-white rounded-lg hover:bg-sentinel-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-400 focus-visible:ring-offset-2"
          aria-label={`Merge ${group.jobs.length} duplicate jobs for ${group.jobs[0].title}`}
        >
          Merge
        </button>
      </div>
      <div className="space-y-2">
        {group.jobs.map((job, idx) => (
          <div
            key={job.id}
            className={`flex items-center justify-between px-3 py-2 rounded ${
              idx === 0
                ? "bg-sentinel-50 dark:bg-sentinel-900/20 border border-sentinel-200 dark:border-sentinel-800"
                : "bg-surface-50 dark:bg-surface-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase">{job.source}</span>
              {idx === 0 && <span className="text-xs bg-sentinel-500 text-white px-1.5 py-0.5 rounded">Primary</span>}
            </div>
            <span className="text-sm text-surface-600 dark:text-surface-300">
              {job.score ? `${Math.round(job.score * 100)}%` : "N/A"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Comparison table row component
function CompareRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <th scope="row" className="py-2 pr-4 font-medium text-surface-700 dark:text-surface-300 whitespace-nowrap text-left">{label}</th>
      {values.map((value, i) => (
        <td key={i} className="py-2 px-4 text-surface-600 dark:text-surface-400">{value}</td>
      ))}
    </tr>
  );
}
