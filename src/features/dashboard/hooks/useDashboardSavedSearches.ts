// Dashboard Saved Searches Hook
// Manages saved search CRUD operations

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type {
  SavedSearch,
  SortOption,
  ScoreFilter,
  PostedDateFilter,
  GhostFilter,
} from "../types";
import { useToast } from "../../../contexts";
import { useUndo } from "../../../hooks/useUndo";
import { safeInvoke, safeInvokeWithToast } from "../../../utils/api";
import { getSafeErrorToastCopy } from "../../../utils/safeErrorCopy";
import { recordBrowserAssistLearningSignalIfEnabled } from "../../../shared/browserAssistLearning";

type BackendSavedSearch = {
  id: string;
  name: string;
  sortBy: SortOption;
  scoreFilter: ScoreFilter;
  sourceFilter: string;
  remoteFilter: string;
  bookmarkFilter: string;
  notesFilter: string;
  postedDateFilter: PostedDateFilter | null;
  salaryMinFilter: number | null;
  salaryMaxFilter: number | null;
  ghostFilter: string | null;
  textSearch: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

function isGhostFilter(value: unknown): value is GhostFilter {
  return value === "all" || value === "real" || value === "ghost";
}

function toBackendSavedSearch(name: string, filters: SavedSearch["filters"]): BackendSavedSearch {
  return {
    id: "",
    name,
    sortBy: filters.sortBy,
    scoreFilter: filters.scoreFilter,
    sourceFilter: filters.sourceFilter,
    remoteFilter: filters.remoteFilter,
    bookmarkFilter: filters.bookmarkFilter,
    notesFilter: filters.notesFilter,
    postedDateFilter: filters.postedDateFilter ?? null,
    salaryMinFilter: filters.salaryMinFilter ?? null,
    salaryMaxFilter: filters.salaryMaxFilter ?? null,
    ghostFilter: filters.ghostFilter ?? null,
    textSearch: null,
    createdAt: "",
    lastUsedAt: null,
  };
}

export function useDashboardSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveSearchModalOpen, setSaveSearchModalOpen] = useState(false);
  const [newSearchName, setNewSearchName] = useState("");
  const toast = useToast();
  const { pushAction } = useUndo();

  // Load saved searches from backend on mount
  useEffect(() => {
    const loadSavedSearches = async () => {
      try {
        const searches = await safeInvoke<BackendSavedSearch[]>('list_saved_searches', {}, {
          logContext: "Load saved searches",
          silent: true // Non-critical on mount
        });
        // Transform backend format to frontend format
        const transformed: SavedSearch[] = searches.map(s => ({
          id: s.id,
          name: s.name,
          filters: {
            sortBy: s.sortBy,
            scoreFilter: s.scoreFilter,
            sourceFilter: s.sourceFilter,
            remoteFilter: s.remoteFilter,
            bookmarkFilter: s.bookmarkFilter,
            notesFilter: s.notesFilter,
            postedDateFilter: s.postedDateFilter ?? undefined,
            ghostFilter: isGhostFilter(s.ghostFilter) ? s.ghostFilter : undefined,
            salaryMinFilter: s.salaryMinFilter,
            salaryMaxFilter: s.salaryMaxFilter,
          },
          createdAt: s.createdAt,
        }));
        setSavedSearches(transformed);
      } catch {
        // Error already logged, silent failure on mount
      }
    };
    loadSavedSearches();
  }, []);

  const handleSaveSearch = useCallback(async (
    getCurrentFilters: () => {
      sortBy: SortOption;
      scoreFilter: ScoreFilter;
      sourceFilter: string;
      remoteFilter: string;
      bookmarkFilter: string;
      notesFilter: string;
      postedDateFilter: PostedDateFilter;
      ghostFilter: GhostFilter;
      salaryMinFilter: number | null;
      salaryMaxFilter: number | null;
    }
  ) => {
    if (!newSearchName.trim()) {
      toast.error("Name this search", "Add a name, then save again.");
      return;
    }

    try {
      const filters = getCurrentFilters();
      const result = await safeInvoke<{
        id: string;
        name: string;
        createdAt: string;
      }>('create_saved_search', {
        search: toBackendSavedSearch(newSearchName.trim(), filters),
      }, {
        logContext: "Create saved search"
      });

      const newSearch: SavedSearch = {
        id: result.id,
        name: result.name,
        filters,
        createdAt: result.createdAt,
      };

      setSavedSearches(prev => [newSearch, ...prev]);
      recordBrowserAssistLearningSignalIfEnabled({
        source: "saved-search",
        action: "saved_search",
        search: newSearch.name,
        recordedAt: new Date().toISOString(),
      });
      setSaveSearchModalOpen(false);
      setNewSearchName("");
      toast.success("Search saved", `"${newSearch.name}" can now be loaded anytime`);
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Search wasn't saved",
        fallbackMessage:
          "Your search filters couldn't be saved. Make sure you entered a unique name and try again.",
      });
      toast.error(safeError.title, safeError.message);
    }
  }, [newSearchName, toast]);

  const handleLoadSearch = useCallback(async (
    search: SavedSearch,
    loadFilters: (filters: SavedSearch['filters']) => void
  ) => {
    loadFilters(search.filters);
    toast.info("Filters loaded", `Applied "${search.name}"`);
    // Track usage in backend (non-blocking, silent failure)
    safeInvoke('use_saved_search', { id: search.id }, { silent: true }).catch(() => {
      // Silent failure - tracking is non-critical
    });
  }, [toast]);

  const handleDeleteSearch = useCallback(async (id: string) => {
    const deletedSearch = savedSearches.find(s => s.id === id);
    if (!deletedSearch) return;

    try {
      await safeInvokeWithToast('delete_saved_search', { id }, toast, {
        logContext: "Delete saved search"
      });
      setSavedSearches(prev => prev.filter((s) => s.id !== id));

      // Push undoable action
      pushAction({
        type: "bookmark", // Reusing bookmark type for saved searches (both are save/unsave operations)
        description: `Deleted search: ${deletedSearch.name}`,
        undo: async () => {
          // Re-create the saved search
          const result = await invoke<{ id: string; name: string; createdAt: string }>('create_saved_search', {
            search: toBackendSavedSearch(deletedSearch.name, deletedSearch.filters),
          });
          const restoredSearch: SavedSearch = {
            ...deletedSearch,
            id: result.id,
            createdAt: result.createdAt,
          };
          setSavedSearches(prev => [restoredSearch, ...prev]);
        },
        redo: async () => {
          await invoke('delete_saved_search', { id });
          setSavedSearches(prev => prev.filter((s) => s.id !== id));
        },
      });
    } catch {
      // Error already logged and shown to user
    }
  }, [savedSearches, toast, pushAction]);

  return {
    savedSearches,
    saveSearchModalOpen,
    setSaveSearchModalOpen,
    newSearchName,
    setNewSearchName,
    handleSaveSearch,
    handleLoadSearch,
    handleDeleteSearch,
  };
}
