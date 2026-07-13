import { BookmarkIcon, CompareIcon, ExportIcon, HideIcon } from "./DashboardIcons";

interface DashboardBulkActionsProps {
  bulkMode: boolean;
  clearSelection: () => void;
  filteredJobCount: number;
  handleBulkBookmark: (bookmark: boolean) => void;
  handleBulkExport: () => void;
  handleBulkHide: () => void;
  handleCompareJobs: () => void;
  selectAllJobs: () => void;
  selectedJobIds: Set<number>;
}

export function DashboardBulkActions({
  bulkMode,
  clearSelection,
  filteredJobCount,
  handleBulkBookmark,
  handleBulkExport,
  handleBulkHide,
  handleCompareJobs,
  selectAllJobs,
  selectedJobIds,
}: DashboardBulkActionsProps) {
  if (!bulkMode) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-sentinel-50 dark:bg-sentinel-900/20 border border-sentinel-200 dark:border-sentinel-800 rounded-lg">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selectedJobIds.size === filteredJobCount && filteredJobCount > 0}
          onChange={(event) => event.target.checked ? selectAllJobs() : clearSelection()}
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
              aria-label={`Download ${selectedJobIds.size} selected jobs`}
            >
              <ExportIcon className="w-4 h-4" />
              Download
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
  );
}
