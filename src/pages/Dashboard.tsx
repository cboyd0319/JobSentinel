// Dashboard - Main job search interface
// Refactored for v1.5 modularization - uses extracted hooks and components

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";
import { listen } from "@tauri-apps/api/event";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Modal, ModalFooter } from "../components/Modal";
import { default as ModalErrorBoundary } from "../components/ModalErrorBoundary";
import { default as ComponentErrorBoundary } from "../components/ComponentErrorBoundary";
import { JobImportModal } from "../components/JobImportModal";
import { FocusTrap } from "../components/FocusTrap";
import { DashboardSkeleton } from "../components/Skeleton";
import { useToast } from "../contexts";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { logError } from "../utils/errorUtils";
import { SCORE_THRESHOLD_GOOD } from "../utils/constants";
import { notifyScrapingComplete } from "../utils/notifications";
import {
  cachedInvoke,
  invalidateCacheByCommand,
  safeInvoke,
} from "../utils/api";
import { PanelSkeleton, WidgetSkeleton } from "../components/LoadingFallbacks";
import { isValidJobUrl } from "../utils/urlValidation";
import { openDeepLink } from "../services/deeplinks";
import {
  getDashboardLoadErrorMessage,
  getDashboardSearchErrorCopy,
} from "./dashboardErrorCopy";

// Lazy load heavy components to reduce initial bundle size
const DashboardWidgets = lazy(() =>
  import("../components/DashboardWidgets").then((m) => ({
    default: m.DashboardWidgets,
  })),
);
const CompanyResearchPanel = lazy(() =>
  import("../components/CompanyResearchPanel").then((m) => ({
    default: m.CompanyResearchPanel,
  })),
);
const Settings = lazy(() => import("./Settings"));

// Extracted modules
import type {
  Job,
  Statistics,
  ScrapingStatus,
  DashboardProps,
  AutoRefreshConfig,
  SavedSearch,
} from "./DashboardTypes";
import {
  CheckCircleIcon,
} from "./DashboardIcons";
import { useDashboardFilters } from "./hooks/useDashboardFilters";
import { useDashboardSearch } from "./hooks/useDashboardSearch";
import { useDashboardJobOps } from "./hooks/useDashboardJobOps";
import { useDashboardSavedSearches } from "./hooks/useDashboardSavedSearches";
import { useDashboardAutoRefresh } from "./hooks/useDashboardAutoRefresh";
import { DashboardFiltersBar } from "./DashboardUI/DashboardFiltersBar";
import { DashboardHeader } from "./DashboardUI/DashboardHeader";
import { DashboardStats } from "./DashboardUI/DashboardStats";
import { DashboardCompareModal } from "./DashboardUI/DashboardCompareModal";
import { DashboardJobList } from "./DashboardUI/DashboardJobList";
import { DashboardNotesModal } from "./DashboardUI/DashboardNotesModal";
import { DashboardSaveSearchModal } from "./DashboardUI/DashboardSaveSearchModal";
import { DuplicateGroupCard } from "./DashboardUI/DuplicateGroupCard";
import { QuickActions } from "./DashboardUI/QuickActions";
import { getNoJobsEmptyStateCopy } from "./DashboardUI/noJobsEmptyStateCopy";

interface DashboardPreferences {
  autoRefresh: AutoRefreshConfig;
  salaryFloorUsd: number | null;
  anyJobSourceEnabled: boolean;
}

export default function Dashboard({
  onNavigate,
  showSettings: showSettingsProp,
  onShowSettingsChange,
  openImportOnMount = false,
  onImportHandled,
}: DashboardProps) {
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [salaryFloorUsd, setSalaryFloorUsd] = useState<number | null>(null);
  const [anyJobSourceEnabled, setAnyJobSourceEnabled] = useState<
    boolean | null
  >(null);

  const toast = useToast();

  // Use prop if provided, otherwise use local state
  const showSettings = showSettingsProp ?? showSettingsLocal;
  const setShowSettings = onShowSettingsChange ?? setShowSettingsLocal;

  // Refs
  const jobListRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null!);
  const fetchDataRef = useRef<(() => Promise<void>) | null>(null);

  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const cooldownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!openImportOnMount) return;
    setShowImportModal(true);
    onImportHandled?.();
  }, [openImportOnMount, onImportHandled]);

  // Stable callback for data updates
  const handleDataUpdate = useCallback(
    (data: { jobs: Job[]; stats: Statistics; status: ScrapingStatus }) => {
      setJobs(data.jobs);
      setStatistics(data.stats);
      setScrapingStatus(data.status);
    },
    [],
  );

  // Extracted hooks
  const filters = useDashboardFilters(jobs);
  const {
    searchHistory,
    addToSearchHistory,
    clearSearchHistory,
    showSearchHistory,
    setShowSearchHistory,
  } = useDashboardSearch();
  const jobOps = useDashboardJobOps(jobs, setJobs);
  const savedSearches = useDashboardSavedSearches();

  // Auto-refresh hook
  const autoRefresh = useDashboardAutoRefresh({
    searching,
    showSettings,
    statistics,
    onDataUpdate: handleDataUpdate,
  });
  const { setAutoRefreshEnabled, setAutoRefreshInterval } = autoRefresh;

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

      // Load only dashboard preferences needed by this page.
      try {
        const preferences = await cachedInvoke<DashboardPreferences>(
          "get_dashboard_preferences",
          undefined,
          60_000,
        );
        if (preferences?.autoRefresh) {
          setAutoRefreshEnabled(preferences.autoRefresh.enabled);
          setAutoRefreshInterval(
            preferences.autoRefresh.interval_minutes || 30,
          );
        }
        if (typeof preferences?.salaryFloorUsd === "number") {
          setSalaryFloorUsd(preferences.salaryFloorUsd);
        }
        if (typeof preferences?.anyJobSourceEnabled === "boolean") {
          setAnyJobSourceEnabled(preferences.anyJobSourceEnabled);
        }
      } catch {
        // Preferences may be unavailable during startup; use defaults.
      }
    } catch (err: unknown) {
      logError("Failed to fetch dashboard data:", err);
      setError(getDashboardLoadErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [setAutoRefreshEnabled, setAutoRefreshInterval]);

  // Keep ref updated to avoid stale closure in timeout
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for jobs-updated event from Tauri backend
  useEffect(() => {
    const unlisten = listen<{ jobs_found: number; jobs_new: number }>(
      "jobs-updated",
      (event) => {
        const { jobs_new } = event.payload;
        if (jobs_new > 0) {
          toast.success(
            "New jobs found!",
            `${jobs_new} new job${jobs_new > 1 ? "s" : ""} added`,
          );
          // Invalidate cache and refresh data
          invalidateCacheByCommand("get_recent_jobs");
          invalidateCacheByCommand("get_statistics");
          fetchData();
        }
      },
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [fetchData, toast]);

  // One-time fallback refresh for initial load
  useEffect(() => {
    if (autoRefresh.autoRefreshEnabled) return;

    const initialRefresh = setTimeout(() => {
      // Use ref to get current fetchData and jobs.length to avoid stale closure
      if (jobs.length === 0 && fetchDataRef.current) {
        fetchDataRef.current();
      }
    }, 30000);

    return () => clearTimeout(initialRefresh);
  }, [autoRefresh.autoRefreshEnabled, jobs.length]);

  // Cleanup cooldown timers on unmount
  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current)
        clearInterval(cooldownIntervalRef.current);
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
    };
  }, []);

  // Manual search
  const handleSearchNow = async () => {
    if (searchCooldown) {
      toast.info(
        "Please wait",
        `Search available in ${cooldownSeconds} seconds`,
      );
      return;
    }

    try {
      // Pre-flight check: warn if no scrapers are enabled
      try {
        const preferences = await safeInvoke<DashboardPreferences>(
          "get_dashboard_preferences",
        );
        if (!preferences.anyJobSourceEnabled) {
          setAnyJobSourceEnabled(false);
          toast.warning(
            "Turn on a job source first",
            "Open Settings, turn on a job source, then search again.",
          );
          return;
        }
        setAnyJobSourceEnabled(true);
      } catch {
        // Preferences check failed; proceed with search anyway.
      }

      setSearching(true);
      setSearchCooldown(true);
      setCooldownSeconds(30);
      setError(null);
      toast.info("Checking job sources", "This may take a moment");

      // Clear any existing timers
      if (cooldownIntervalRef.current)
        clearInterval(cooldownIntervalRef.current);
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

      await safeInvoke("search_jobs", undefined, {
        logContext: "Manual job search",
      });

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
      toast.success("Job check complete", `Found ${statsData.total_jobs} jobs`);

      if (statsData.high_matches > 0) {
        notifyScrapingComplete(jobsData.length, statsData.high_matches);
      }

      // Clear cooldown after 30 seconds from start
      cooldownTimeoutRef.current = setTimeout(() => {
        setSearchCooldown(false);
        setCooldownSeconds(0);
        cooldownTimeoutRef.current = null;
      }, 30000);
    } catch (err: unknown) {
      const safeError = getDashboardSearchErrorCopy(err);
      setError(safeError.message);
      toast.error(safeError.title, safeError.message);
      // Reset cooldown on error so user can retry
      setSearchCooldown(false);
      setCooldownSeconds(0);
    } finally {
      setSearching(false);
    }
  };

  // Open job link.
  const handleOpenJob = useCallback(
    async (job: Job) => {
      // Security: validate job link before opening.
      if (!isValidJobUrl(job.url)) {
        logError(
          "Security: Blocked unsafe saved job link:",
          job.url.slice(0, 50),
        );
        toast.error(
          "Check job link",
          "This saved link does not look safe to open.",
        );
        return;
      }

      try {
        await openDeepLink(job.url);
      } catch (err: unknown) {
        logError("Failed to open job link via Tauri command:", err);
        toast.error("Could not open job link", "Copy the link and open it in your browser.");
      }
    },
    [toast],
  );

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

  useEffect(() => {
    const handleFocusSearch = () => searchInputRef.current?.focus();
    const handleSlashFocus = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        (event.key !== "/" && event.code !== "Slash") ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      window.setTimeout(() => {
        const searchInput = document.querySelector<HTMLInputElement>(
          "[data-testid='search-input']",
        );
        (searchInput ?? searchInputRef.current)?.focus();
      }, 0);
    };

    window.addEventListener("keyboard-focus-search", handleFocusSearch);
    document.addEventListener("keydown", handleSlashFocus, true);
    return () => {
      window.removeEventListener("keyboard-focus-search", handleFocusSearch);
      document.removeEventListener("keydown", handleSlashFocus, true);
    };
  }, []);

  // Scroll selected job into view
  useEffect(() => {
    if (isKeyboardActive && selectedIndex >= 0 && jobListRef.current) {
      const selectedElement = jobListRef.current.querySelector(
        `[data-selected="true"]`,
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [selectedIndex, isKeyboardActive]);

  // Memoized callbacks for QuickActions and DashboardFiltersBar
  const handleExportHighMatches = useCallback(() => {
    const highMatchJobs = jobs.filter(
      (j) => (j.score ?? 0) >= SCORE_THRESHOLD_GOOD,
    );
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

  const handleLoadSearch = useCallback(
    (search: SavedSearch) => {
      savedSearches.handleLoadSearch(search, filters.loadFilters);
    },
    [savedSearches, filters.loadFilters],
  );

  const handleSelectAllJobs = useCallback(() => {
    jobOps.selectAllJobs(filters.filteredAndSortedJobs);
  }, [jobOps, filters.filteredAndSortedJobs]);

  const handleExportSelectedJobs = useCallback(() => {
    jobOps.handleBulkExport(
      filters.filteredAndSortedJobs.filter((j) =>
        jobOps.selectedJobIds.has(j.id),
      ),
    );
  }, [jobOps, filters.filteredAndSortedJobs]);

  const handleSettingsClose = useCallback(() => {
    invalidateCacheByCommand("get_dashboard_preferences");
    setShowSettings(false);
    void fetchDataRef.current?.();
  }, [setShowSettings]);

  // Settings modal
  if (showSettings) {
    return (
      <ModalErrorBoundary
        modalName="settings"
        onClose={handleSettingsClose}
      >
        <Suspense fallback={<PanelSkeleton />}>
          <Settings onClose={handleSettingsClose} />
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
            JobSentinel needs attention
          </h2>
          <p className="text-surface-500 dark:text-surface-400 mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </Card>
      </div>
    );
  }

  const noJobsCopy = getNoJobsEmptyStateCopy(anyJobSourceEnabled);
  const noSourcesEnabled = anyJobSourceEnabled === false;

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

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6">
        <DashboardStats statistics={statistics} />

        {/* Analytics Widgets (collapsible, lazy-loaded) */}
        <ComponentErrorBoundary componentName="DashboardWidgets" silentFail>
          <Suspense fallback={<WidgetSkeleton />}>
            <DashboardWidgets className="mb-6" />
          </Suspense>
        </ComponentErrorBoundary>

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
          onImportJob={() => setShowImportModal(true)}
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

          <DashboardJobList
            jobs={jobs}
            filteredJobs={filters.filteredAndSortedJobs}
            noJobsCopy={noJobsCopy}
            noSourcesEnabled={noSourcesEnabled}
            searching={searching}
            jobListRef={jobListRef}
            bulkMode={jobOps.bulkMode}
            selectedJobIds={jobOps.selectedJobIds}
            isKeyboardActive={isKeyboardActive}
            selectedIndex={selectedIndex}
            salaryFloorUsd={salaryFloorUsd}
            onSearchNow={handleSearchNow}
            onOpenSettings={() => setShowSettings(true)}
            onOpenImport={() => setShowImportModal(true)}
            onClearFilters={filters.clearFilters}
            onToggleJobSelection={jobOps.toggleJobSelection}
            onHideJob={jobOps.handleHideJob}
            onToggleBookmark={jobOps.handleToggleBookmark}
            onEditNotes={jobOps.handleEditNotes}
            onResearchCompany={setResearchCompany}
            onOpenApplicationAssist={onNavigate ? () => onNavigate("automation") : undefined}
          />
        </section>
      </main>

      <DashboardNotesModal
        isOpen={jobOps.notesModalOpen}
        notesText={jobOps.notesText}
        onChange={jobOps.setNotesText}
        onClose={jobOps.handleCloseNotesModal}
        onSave={jobOps.handleSaveNotes}
      />

      <DashboardSaveSearchModal
        currentFilters={{
          sortBy: filters.sortBy,
          scoreFilter: filters.scoreFilter,
          sourceFilter: filters.sourceFilter,
          remoteFilter: filters.remoteFilter,
          bookmarkFilter: filters.bookmarkFilter,
          notesFilter: filters.notesFilter,
          postedDateFilter: filters.postedDateFilter,
          salaryMinFilter: filters.salaryMinFilter,
          salaryMaxFilter: filters.salaryMaxFilter,
        }}
        isOpen={savedSearches.saveSearchModalOpen}
        onClose={() => {
          savedSearches.setSaveSearchModalOpen(false);
          savedSearches.setNewSearchName("");
        }}
        newSearchName={savedSearches.newSearchName}
        savedSearches={savedSearches.savedSearches}
        onDeleteSearch={savedSearches.handleDeleteSearch}
        onLoadSearch={(search) => {
          savedSearches.handleLoadSearch(search, filters.loadFilters);
          savedSearches.setSaveSearchModalOpen(false);
        }}
        onNameChange={savedSearches.setNewSearchName}
        onSave={() =>
          savedSearches.handleSaveSearch(filters.getCurrentFilters)
        }
      />

      {/* Possible repeats modal */}
      <Modal
        isOpen={jobOps.duplicatesModalOpen}
        onClose={() => jobOps.setDuplicatesModalOpen(false)}
        title="Possible Repeated Jobs"
      >
        <div className="space-y-4">
          {jobOps.duplicateGroups.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-surface-600 dark:text-surface-400">
                No likely repeated postings found.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-surface-600 dark:text-surface-400">
                Found {jobOps.duplicateGroups.length} possible repeat groups.
                These are similar saved postings, not proof that multiple
                sources confirmed the same job. Review before hiding extras.
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
                <Button
                  variant="secondary"
                  onClick={() => jobOps.setDuplicatesModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => jobOps.handleMergeAllDuplicates(fetchData)}
                >
                  Hide Extras ({jobOps.duplicateGroups.length})
                </Button>
              </ModalFooter>
            </>
          )}
        </div>
      </Modal>

      <DashboardCompareModal
        isOpen={jobOps.compareModalOpen}
        onClose={() => jobOps.setCompareModalOpen(false)}
        comparedJobs={jobOps.comparedJobs}
      />

      {/* Company Research Modal */}
      {researchCompany && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setResearchCompany(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setResearchCompany(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`Company research for ${researchCompany}`}
        >
          <FocusTrap>
            <ComponentErrorBoundary
              componentName="CompanyResearchPanel"
              fallback={() => (
                <div className="p-6 text-center">
                  <p className="text-red-600 dark:text-red-400 mb-4">
                    Could not load company research
                  </p>
                  <Button onClick={() => setResearchCompany(null)}>
                    Close
                  </Button>
                </div>
              )}
            >
              <Suspense fallback={<PanelSkeleton />}>
                <CompanyResearchPanel
                  companyName={researchCompany}
                  onClose={() => setResearchCompany(null)}
                />
              </Suspense>
            </ComponentErrorBoundary>
          </FocusTrap>
        </div>
      )}

      {/* Import Job Modal */}
      <JobImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          // Refresh jobs list after import
          fetchData();
        }}
      />
    </div>
  );
}
