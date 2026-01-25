// Dashboard Saved Searches Hook
// Manages saved search CRUD operations

import { useState, useEffect, useCallback } from "react";
import type { SavedSearch, SortOption, ScoreFilter, PostedDateFilter } from "../DashboardTypes";
import { useToast } from "../../contexts";
import { safeInvoke, safeInvokeWithToast } from "../../utils/api";

export function useDashboardSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveSearchModalOpen, setSaveSearchModalOpen] = useState(false);
  const [newSearchName, setNewSearchName] = useState("");
  const toast = useToast();

  // Load saved searches from backend on mount
  useEffect(() => {
    const loadSavedSearches = async () => {
      try {
        const searches = await safeInvoke<Array<{
          id: string;
          name: string;
          sort_by: SortOption;
          score_filter: ScoreFilter;
          source_filter: string;
          remote_filter: string;
          bookmark_filter: string;
          notes_filter: string;
          posted_date_filter: PostedDateFilter | null;
          salary_min_filter: number | null;
          salary_max_filter: number | null;
          ghost_filter: string | null;
          text_search: string | null;
          created_at: string;
          last_used_at: string | null;
        }>>('list_saved_searches', {}, {
          logContext: "Load saved searches",
          silent: true // Non-critical on mount
        });
        // Transform backend format to frontend format
        const transformed: SavedSearch[] = searches.map(s => ({
          id: s.id,
          name: s.name,
          filters: {
            sortBy: s.sort_by,
            scoreFilter: s.score_filter,
            sourceFilter: s.source_filter,
            remoteFilter: s.remote_filter,
            bookmarkFilter: s.bookmark_filter,
            notesFilter: s.notes_filter,
            postedDateFilter: s.posted_date_filter ?? undefined,
            salaryMinFilter: s.salary_min_filter,
            salaryMaxFilter: s.salary_max_filter,
          },
          createdAt: s.created_at,
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
      salaryMinFilter: number | null;
      salaryMaxFilter: number | null;
    }
  ) => {
    if (!newSearchName.trim()) {
      toast.error("Name required", "Please enter a name for this search");
      return;
    }

    try {
      const filters = getCurrentFilters();
      const result = await safeInvoke<{
        id: string;
        name: string;
        created_at: string;
      }>('create_saved_search', {
        name: newSearchName.trim(),
        sortBy: filters.sortBy,
        scoreFilter: filters.scoreFilter,
        sourceFilter: filters.sourceFilter,
        remoteFilter: filters.remoteFilter,
        bookmarkFilter: filters.bookmarkFilter,
        notesFilter: filters.notesFilter,
        postedDateFilter: filters.postedDateFilter,
        salaryMinFilter: filters.salaryMinFilter,
        salaryMaxFilter: filters.salaryMaxFilter,
      }, {
        logContext: "Create saved search"
      });

      const newSearch: SavedSearch = {
        id: result.id,
        name: result.name,
        filters,
        createdAt: result.created_at,
      };

      setSavedSearches(prev => [newSearch, ...prev]);
      setSaveSearchModalOpen(false);
      setNewSearchName("");
      toast.success("Search saved", `"${newSearch.name}" can now be loaded anytime`);
    } catch (error: unknown) {
      const enhanced = error as Error & { userFriendly?: { title: string; message: string } };
      toast.error(
        enhanced.userFriendly?.title || "Search wasn't saved",
        enhanced.userFriendly?.message || "Your search filters couldn't be saved. Make sure you entered a unique name and try again."
      );
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
    try {
      await safeInvokeWithToast('delete_saved_search', { id }, toast, {
        logContext: "Delete saved search"
      });
      setSavedSearches(prev => prev.filter((s) => s.id !== id));
      toast.success("Search deleted", "Saved search removed");
    } catch {
      // Error already logged and shown to user
    }
  }, [toast]);

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
