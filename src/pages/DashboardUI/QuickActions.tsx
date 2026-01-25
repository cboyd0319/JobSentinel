// Quick Actions Component
// One-click common actions for power users and beginners alike

import { useState, memo } from "react";
import { Card } from "../../components";

interface QuickActionsProps {
  totalJobs: number;
  highMatches: number;
  filteredCount: number;
  onExportHighMatches: () => void;
  onShowHighMatchesOnly: () => void;
  onShowRemoteOnly: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function QuickActions({
  totalJobs,
  highMatches,
  filteredCount,
  onExportHighMatches,
  onShowHighMatchesOnly,
  onShowRemoteOnly,
  onClearFilters,
  hasActiveFilters,
}: QuickActionsProps) {
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Don't show if no jobs
  if (totalJobs === 0) return null;

  return (
    <div className="mb-6">
      {/* Quick Actions Row */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide">
          Quick Actions
        </span>

        {highMatches > 0 && (
          <button
            onClick={onShowHighMatchesOnly}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
                       bg-alert-50 dark:bg-alert-900/30 text-alert-700 dark:text-alert-300
                       hover:bg-alert-100 dark:hover:bg-alert-900/50 transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert-500 focus-visible:ring-offset-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            View {highMatches} High Match{highMatches !== 1 ? 'es' : ''}
          </button>
        )}

        <button
          onClick={onShowRemoteOnly}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
                     bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300
                     hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-500 focus-visible:ring-offset-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Remote Only
        </button>

        {highMatches > 0 && (
          <button
            onClick={onExportHighMatches}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
                       bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300
                       hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-500 focus-visible:ring-offset-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Top Jobs
          </button>
        )}

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
                       text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear Filters
          </button>
        )}

        <div className="flex-1" />

        {/* Keyboard Shortcuts Toggle */}
        <button
          onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded
                     text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200
                     hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-500 focus-visible:ring-offset-1"
          title="Keyboard shortcuts"
          aria-expanded={showKeyboardShortcuts}
          aria-controls="keyboard-shortcuts-panel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="hidden sm:inline">Shortcuts</span>
          <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-mono bg-surface-200 dark:bg-surface-600 rounded">?</kbd>
        </button>
      </div>

      {/* Keyboard Shortcuts Panel */}
      {showKeyboardShortcuts && (
        <Card id="keyboard-shortcuts-panel" className="mb-4 p-4 dark:bg-surface-800" role="region" aria-label="Keyboard shortcuts">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200">
              Keyboard Shortcuts
            </h4>
            <button
              onClick={() => setShowKeyboardShortcuts(false)}
              className="p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-500 rounded"
              aria-label="Close keyboard shortcuts"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
            <ShortcutItem keys={["↑", "↓"]} description="Navigate jobs" />
            <ShortcutItem keys={["Enter"]} description="Open job" />
            <ShortcutItem keys={["B"]} description="Bookmark" />
            <ShortcutItem keys={["H"]} description="Hide job" />
            <ShortcutItem keys={["N"]} description="Add notes" />
            <ShortcutItem keys={["I"]} description="Research company" />
            <ShortcutItem keys={["Space"]} description="Select job" />
            <ShortcutItem keys={["/"]} description="Focus search" />
            <ShortcutItem keys={["R"]} description="Refresh jobs" />
            <ShortcutItem keys={["Esc"]} description="Clear selection" />
          </div>
        </Card>
      )}

      {/* Filter Summary */}
      {hasActiveFilters && (
        <div className="text-xs text-surface-500 dark:text-surface-400">
          Showing {filteredCount} of {totalJobs} jobs
        </div>
      )}
    </div>
  );
}

const ShortcutItem = memo(function ShortcutItem({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5
                       text-xs font-mono bg-surface-100 dark:bg-surface-700
                       text-surface-700 dark:text-surface-300 rounded border
                       border-surface-300 dark:border-surface-600"
          >
            {key}
          </kbd>
        ))}
      </div>
      <span className="text-surface-600 dark:text-surface-400 truncate">{description}</span>
    </div>
  );
});
