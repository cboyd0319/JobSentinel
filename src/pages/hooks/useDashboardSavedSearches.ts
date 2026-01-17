// Dashboard Saved Searches Hook
// Manages saved search CRUD operations

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SavedSearch, SortOption, ScoreFilter, PostedDateFilter } from "../DashboardTypes";
import { useToast } from "../../contexts";
import { getErrorMessage, logError } from "../../utils/errorUtils";

export function useDashboardSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveSearchModalOpen, setSaveSearchModalOpen] = useState(false);
  const [newSearchName, setNewSearchName] = useState("");
  const toast = useToast();

  // Load saved searches from backend on mount
  useEffect(() => {
    const loadSavedSearches = async () => {
      try {
        const searches = await invoke<Array<{
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
        }>>('list_saved_searches');
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
      } catch (err) {
        logError("Failed to load saved searches:", err);
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
      const result = await invoke<{
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
    } catch (err) {
      logError("Failed to save search:", err);
      toast.error("Failed to save", getErrorMessage(err));
    }
  }, [newSearchName, toast]);

  const handleLoadSearch = useCallback(async (
    search: SavedSearch,
    loadFilters: (filters: SavedSearch['filters']) => void
  ) => {
    loadFilters(search.filters);
    toast.info("Filters loaded", `Applied "${search.name}"`);
    // Track usage in backend (non-blocking)
    invoke('use_saved_search', { id: search.id }).catch(err => {
      logError("Failed to track search usage:", err);
    });
  }, [toast]);

  const handleDeleteSearch = useCallback(async (id: string) => {
    try {
      await invoke('delete_saved_search', { id });
      setSavedSearches(prev => prev.filter((s) => s.id !== id));
      toast.success("Search deleted", "Saved search removed");
    } catch (err) {
      logError("Failed to delete search:", err);
      toast.error("Failed to delete", getErrorMessage(err));
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
