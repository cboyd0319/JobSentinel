// Dashboard Filters Bar Component
// Contains all filter controls, search, bulk actions, and action buttons

import { memo, RefObject, useState, useEffect } from "react";
import { Dropdown, Tooltip } from "../../components";
import { useDebouncedValue } from "../../hooks";
import {
  KeyboardIcon,
  ExportIcon,
  DuplicateIcon,
  SelectIcon,
  SaveIcon,
  BookmarkIcon,
  HideIcon,
  CompareIcon,
  HistoryIcon,
} from "../DashboardIcons";
import type { Job, SortOption, ScoreFilter, PostedDateFilter, GhostFilter, SavedSearch } from "../DashboardTypes";

interface DashboardFiltersBarProps {
  jobs: Job[];
  filteredJobs: Job[];
  textSearch: string;
  setTextSearch: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement>;
  showSearchHistory: boolean;
  setShowSearchHistory: (value: boolean) => void;
  searchHistory: string[];
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  sortBy: SortOption;
  setSortBy: (value: SortOption) => void;
  scoreFilter: ScoreFilter;
  setScoreFilter: (value: ScoreFilter) => void;
  sourceFilter: string;
  setSourceFilter: (value: string) => void;
  availableSources: string[];
  remoteFilter: string;
  setRemoteFilter: (value: string) => void;
  bookmarkFilter: string;
  setBookmarkFilter: (value: string) => void;
  notesFilter: string;
  setNotesFilter: (value: string) => void;
  ghostFilter: GhostFilter;
  setGhostFilter: (value: GhostFilter) => void;
  postedDateFilter: PostedDateFilter;
  setPostedDateFilter: (value: PostedDateFilter) => void;
  salaryMinFilter: number | null;
  setSalaryMinFilter: (value: number | null) => void;
  salaryMaxFilter: number | null;
  setSalaryMaxFilter: (value: number | null) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  checkingDuplicates: boolean;
  handleCheckDuplicates: () => void;
  bulkMode: boolean;
  toggleBulkMode: () => void;
  onExportJobs: () => void;
  onOpenSaveSearch: () => void;
  savedSearches: SavedSearch[];
  onLoadSearch: (search: SavedSearch) => void;
  // Bulk mode props
  selectedJobIds: Set<number>;
  selectAllJobs: () => void;
  clearSelection: () => void;
  handleBulkExport: () => void;
  handleCompareJobs: () => void;
  handleBulkBookmark: (bookmark: boolean) => void;
  handleBulkHide: () => void;
}

export const DashboardFiltersBar = memo(function DashboardFiltersBar({
  jobs,
  filteredJobs,
  textSearch,
  setTextSearch,
  searchInputRef,
  showSearchHistory,
  setShowSearchHistory,
  searchHistory,
  addToSearchHistory,
  clearSearchHistory,
  sortBy,
  setSortBy,
  scoreFilter,
  setScoreFilter,
  sourceFilter,
  setSourceFilter,
  availableSources,
  remoteFilter,
  setRemoteFilter,
  bookmarkFilter,
  setBookmarkFilter,
  notesFilter,
  setNotesFilter,
  ghostFilter,
  setGhostFilter,
  postedDateFilter,
  setPostedDateFilter,
  salaryMinFilter,
  setSalaryMinFilter,
  salaryMaxFilter,
  setSalaryMaxFilter,
  hasActiveFilters,
  clearFilters,
  checkingDuplicates,
  handleCheckDuplicates,
  bulkMode,
  toggleBulkMode,
  onExportJobs,
  onOpenSaveSearch,
  savedSearches,
  onLoadSearch,
  selectedJobIds,
  selectAllJobs,
  clearSelection,
  handleBulkExport,
  handleCompareJobs,
  handleBulkBookmark,
  handleBulkHide,
}: DashboardFiltersBarProps) {
  // Local state for responsive input, debounced for filtering performance
  const [localSearch, setLocalSearch] = useState(textSearch);
  const debouncedSearch = useDebouncedValue(localSearch, 300);

  // Sync debounced value to parent for filtering
  useEffect(() => {
    if (debouncedSearch !== textSearch) {
      setTextSearch(debouncedSearch);
    }
  }, [debouncedSearch, setTextSearch, textSearch]);

  // Sync from parent when textSearch changes externally (e.g., loading saved search)
  useEffect(() => {
    if (textSearch !== localSearch && textSearch !== debouncedSearch) {
      setLocalSearch(textSearch);
    }
  }, [textSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
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
          <>
            <span className="text-sm text-surface-500 dark:text-surface-400">
              Showing {filteredJobs.length} of {jobs.length} jobs
            </span>
            {/* Screen reader announcement for filter changes */}
            <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {filteredJobs.length === jobs.length
                ? `Showing all ${jobs.length} jobs`
                : `Filtered to ${filteredJobs.length} of ${jobs.length} jobs`}
            </span>
          </>
        )}
      </div>

      {/* Filter Controls */}
      {jobs.length > 0 && (
        <div className="flex flex-wrap items-center gap-3" data-tour="job-filters">
          {/* Quick text search with history */}
          <div className="relative">
            <Tooltip
              content={
                <div className="text-xs space-y-1">
                  <p className="font-medium">Advanced Search:</p>
                  <p>• Comma or OR: react, vue (any match)</p>
                  <p>• AND: senior AND engineer (all match)</p>
                  <p>• NOT or -: -intern (exclude term)</p>
                </div>
              }
              position="bottom"
            >
              <input
                ref={searchInputRef}
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onFocus={() => setShowSearchHistory(true)}
                onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && localSearch.trim()) {
                    addToSearchHistory(localSearch.trim());
                    setShowSearchHistory(false);
                  }
                }}
                placeholder="Search (AND, OR, NOT)..."
                className="w-48 sm:w-56 pl-8 pr-8 py-1.5 text-sm bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-500 focus:border-transparent"
                aria-label="Search jobs with advanced syntax"
                autoComplete="off"
                data-testid="search-input"
              />
            </Tooltip>
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Search History Dropdown */}
            {showSearchHistory && searchHistory.length > 0 && !textSearch && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-lg shadow-lg z-20 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-surface-200 dark:border-surface-600">
                  <span className="text-xs text-surface-500 font-medium">Recent Searches</span>
                  <button
                    onClick={clearSearchHistory}
                    className="text-xs text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
                    aria-label="Clear search history"
                  >
                    Clear
                  </button>
                </div>
                <ul className="max-h-40 overflow-y-auto">
                  {searchHistory.map((query, idx) => (
                    <li key={idx}>
                      <button
                        onClick={() => {
                          setTextSearch(query);
                          setShowSearchHistory(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
                        aria-label={`Use search: ${query}`}
                      >
                        <HistoryIcon className="w-3 h-3 text-surface-400" />
                        {query}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

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

          {/* Ghost Filter */}
          <Dropdown
            label="Legitimacy"
            value={ghostFilter}
            onChange={(value) => setGhostFilter(value as GhostFilter)}
            options={[
              { value: "all", label: "All Jobs" },
              { value: "real", label: "Likely Real" },
              { value: "ghost", label: "Possible Ghost" },
            ]}
          />

          {/* Posted Date Filter */}
          <Dropdown
            label="Posted"
            value={postedDateFilter}
            onChange={(value) => setPostedDateFilter(value as PostedDateFilter)}
            options={[
              { value: "all", label: "Any Time" },
              { value: "24h", label: "Last 24 Hours" },
              { value: "7d", label: "Last 7 Days" },
              { value: "30d", label: "Last 30 Days" },
            ]}
          />

          {/* Salary Range Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-500 dark:text-surface-400 whitespace-nowrap">Salary:</span>
            <input
              type="number"
              placeholder="Min $K"
              value={salaryMinFilter ?? ""}
              onChange={(e) => setSalaryMinFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="w-20 px-2 py-1 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
              min={0}
              step={10}
              aria-label="Minimum salary in thousands"
            />
            <span className="text-xs text-surface-400">-</span>
            <input
              type="number"
              placeholder="Max $K"
              value={salaryMaxFilter ?? ""}
              onChange={(e) => setSalaryMaxFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="w-20 px-2 py-1 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
              min={0}
              step={10}
              aria-label="Maximum salary in thousands"
            />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-sentinel-600 dark:text-sentinel-400 hover:underline"
              aria-label="Clear all active filters"
            >
              Clear filters
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Check duplicates button */}
          <Tooltip content="Find and merge duplicate jobs" position="bottom">
            <button
              onClick={handleCheckDuplicates}
              disabled={checkingDuplicates}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Check for duplicates"
            >
              <DuplicateIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{checkingDuplicates ? "Checking..." : "Duplicates"}</span>
            </button>
          </Tooltip>

          {/* Select toggle button */}
          <Tooltip content={bulkMode ? "Exit selection mode" : "Select multiple jobs"} position="bottom">
            <button
              onClick={toggleBulkMode}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                bulkMode
                  ? "bg-sentinel-100 dark:bg-sentinel-900/30 text-sentinel-600 dark:text-sentinel-400"
                  : "text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600"
              }`}
              aria-label={bulkMode ? "Exit selection mode" : "Select multiple jobs"}
            >
              <SelectIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{bulkMode ? "Done" : "Select"}</span>
            </button>
          </Tooltip>

          {/* Export button */}
          <Tooltip content="Export jobs to CSV" position="bottom">
            <button
              onClick={onExportJobs}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors"
              aria-label="Export jobs to CSV"
            >
              <ExportIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </Tooltip>

          {/* Save current search button */}
          <Tooltip content="Save current filters" position="bottom">
            <button
              onClick={onOpenSaveSearch}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors"
              aria-label="Save current filters"
            >
              <SaveIcon className="w-4 h-4" />
            </button>
          </Tooltip>

          {/* Saved searches dropdown */}
          {savedSearches.length > 0 && (
            <Dropdown
              label="Saved"
              value=""
              onChange={(value) => {
                const search = savedSearches.find((s) => s.id === value);
                if (search) onLoadSearch(search);
              }}
              options={[
                { value: "", label: `${savedSearches.length} saved` },
                ...savedSearches.map((s) => ({
                  value: s.id,
                  label: s.name,
                })),
              ]}
            />
          )}
        </div>
      )}

      {/* Bulk actions toolbar */}
      {bulkMode && (
        <div className="flex items-center gap-3 p-3 bg-sentinel-50 dark:bg-sentinel-900/20 border border-sentinel-200 dark:border-sentinel-800 rounded-lg">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedJobIds.size === filteredJobs.length && filteredJobs.length > 0}
              onChange={(e) => e.target.checked ? selectAllJobs() : clearSelection()}
              className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-sentinel-500 focus-visible:ring-sentinel-500"
              aria-label="Select all jobs"
            />
            <span className="text-sm text-surface-600 dark:text-surface-400">
              {selectedJobIds.size > 0
                ? `${selectedJobIds.size} selected`
                : "Select all"}
            </span>
          </div>

          {selectedJobIds.size > 0 && (
            <>
              <div className="h-4 w-px bg-surface-300 dark:bg-surface-600" />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkExport}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-100 hover:bg-surface-200 dark:hover:bg-surface-700 rounded transition-colors"
                  aria-label={`Export ${selectedJobIds.size} selected jobs to CSV`}
                >
                  <ExportIcon className="w-4 h-4" />
                  Export
                </button>
                <button
                  onClick={handleCompareJobs}
                  disabled={selectedJobIds.size < 2 || selectedJobIds.size > 3}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-surface-600 dark:text-surface-300 hover:text-sentinel-600 dark:hover:text-sentinel-400 hover:bg-surface-200 dark:hover:bg-surface-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={selectedJobIds.size < 2 ? "Select 2-3 jobs to compare" : selectedJobIds.size > 3 ? "Maximum 3 jobs for comparison" : `Compare ${selectedJobIds.size} selected jobs`}
                  title={selectedJobIds.size < 2 ? "Select 2-3 jobs" : selectedJobIds.size > 3 ? "Max 3 jobs" : "Compare selected jobs"}
                >
                  <CompareIcon className="w-4 h-4" />
                  Compare
                </button>
                <button
                  onClick={() => handleBulkBookmark(true)}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-surface-600 dark:text-surface-300 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-surface-200 dark:hover:bg-surface-700 rounded transition-colors"
                  aria-label={`Bookmark ${selectedJobIds.size} selected jobs`}
                >
                  <BookmarkIcon className="w-4 h-4" />
                  Bookmark
                </button>
                <button
                  onClick={handleBulkHide}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  aria-label={`Hide ${selectedJobIds.size} selected jobs`}
                >
                  <HideIcon className="w-4 h-4" />
                  Hide
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});
