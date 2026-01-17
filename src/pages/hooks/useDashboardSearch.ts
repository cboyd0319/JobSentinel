// Dashboard Search History Hook
// Manages search history persistence and query handling

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logError } from "../../utils/errorUtils";

export function useDashboardSearch() {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);

  // Load search history from backend on mount
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const history = await invoke<string[]>('get_search_history');
        setSearchHistory(history);
      } catch (err) {
        logError("Failed to load search history:", err);
      }
    };
    loadSearchHistory();
  }, []);

  // Add to search history when user finishes typing
  const addToSearchHistory = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) return;
    try {
      await invoke('add_search_history', { query: query.trim() });
      // Update local state optimistically
      setSearchHistory(prev => {
        const filtered = prev.filter(h => h.toLowerCase() !== query.toLowerCase());
        return [query.trim(), ...filtered];
      });
    } catch (err) {
      logError("Failed to save search history:", err);
    }
  }, []);

  const clearSearchHistory = useCallback(async () => {
    try {
      await invoke('clear_search_history');
      setSearchHistory([]);
    } catch (err) {
      logError("Failed to clear search history:", err);
    }
  }, []);

  return {
    searchHistory,
    showSearchHistory,
    setShowSearchHistory,
    addToSearchHistory,
    clearSearchHistory,
  };
}
