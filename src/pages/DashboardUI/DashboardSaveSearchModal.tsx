import { useId } from "react";
import { Button } from "../../components/Button";
import { Modal, ModalFooter } from "../../components/Modal";
import { formatSalaryNumber } from "../../utils/formatUtils";
import { formatJobSourceLabel } from "../../utils/sourceLabels";
import {
  formatBookmarkFilter,
  formatNotesFilter,
  formatRemoteFilter,
  formatScoreFilter,
  formatSortOption,
} from "./filterLabels";
import { TrashIcon } from "../DashboardIcons";
import type {
  PostedDateFilter,
  SavedSearch,
  ScoreFilter,
  SortOption,
} from "../DashboardTypes";

interface DashboardSaveSearchFilters {
  sortBy: SortOption;
  scoreFilter: ScoreFilter;
  sourceFilter: string;
  remoteFilter: string;
  bookmarkFilter: string;
  notesFilter: string;
  postedDateFilter: PostedDateFilter;
  salaryMinFilter: number | null;
  salaryMaxFilter: number | null;
}

interface DashboardSaveSearchModalProps {
  currentFilters: DashboardSaveSearchFilters;
  isOpen: boolean;
  newSearchName: string;
  savedSearches: SavedSearch[];
  onClose: () => void;
  onDeleteSearch: (id: string) => void;
  onLoadSearch: (search: SavedSearch) => void;
  onNameChange: (name: string) => void;
  onSave: () => void;
}

export function DashboardSaveSearchModal({
  currentFilters,
  isOpen,
  newSearchName,
  savedSearches,
  onClose,
  onDeleteSearch,
  onLoadSearch,
  onNameChange,
  onSave,
}: DashboardSaveSearchModalProps) {
  const saveSearchNameId = useId();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save Current Filters">
      <div className="space-y-4">
        <p className="text-sm text-surface-600 dark:text-surface-400">
          Save your current filter settings to quickly apply them later.
        </p>
        <div>
          <label
            htmlFor={saveSearchNameId}
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
          >
            Name
          </label>
          <input
            id={saveSearchNameId}
            type="text"
            value={newSearchName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., Remote Customer Support"
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500 dark:focus:border-sentinel-400 dark:focus-visible:ring-sentinel-400"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
            }}
          />
        </div>
        <div className="text-xs text-surface-500 dark:text-surface-400">
          <p className="font-medium mb-1">Current filters:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Sort: {formatSortOption(currentFilters.sortBy)}</li>
            {currentFilters.scoreFilter !== "all" && (
              <li>Fit: {formatScoreFilter(currentFilters.scoreFilter)}</li>
            )}
            {currentFilters.sourceFilter !== "all" && (
              <li>Source: {formatJobSourceLabel(currentFilters.sourceFilter)}</li>
            )}
            {currentFilters.remoteFilter !== "all" && (
              <li>Location: {formatRemoteFilter(currentFilters.remoteFilter)}</li>
            )}
            {currentFilters.bookmarkFilter !== "all" && (
              <li>Saved: {formatBookmarkFilter(currentFilters.bookmarkFilter)}</li>
            )}
            {currentFilters.notesFilter !== "all" && (
              <li>Notes: {formatNotesFilter(currentFilters.notesFilter)}</li>
            )}
            {currentFilters.postedDateFilter !== "all" && (
              <li>
                Posted:{" "}
                {currentFilters.postedDateFilter === "24h"
                  ? "Last 24 hours"
                  : currentFilters.postedDateFilter === "7d"
                    ? "Last 7 days"
                    : "Last 30 days"}
              </li>
            )}
            {currentFilters.salaryMinFilter !== null && (
              <li>
                Min salary: {formatSalaryNumber(currentFilters.salaryMinFilter)}
              </li>
            )}
            {currentFilters.salaryMaxFilter !== null && (
              <li>
                Max salary: {formatSalaryNumber(currentFilters.salaryMaxFilter)}
              </li>
            )}
          </ul>
        </div>
        {savedSearches.length > 0 && (
          <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
            <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
              Saved searches ({savedSearches.length})
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="flex items-center justify-between px-2 py-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 group"
                >
                  <button
                    onClick={() => onLoadSearch(search)}
                    className="text-sm text-surface-600 dark:text-surface-300 hover:text-sentinel-600 dark:hover:text-sentinel-400 text-left flex-1"
                    aria-label={`Load saved search: ${search.name}`}
                  >
                    {search.name}
                  </button>
                  <button
                    onClick={() => onDeleteSearch(search.id)}
                    className="p-1 text-surface-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!newSearchName.trim()}>
            Save
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
