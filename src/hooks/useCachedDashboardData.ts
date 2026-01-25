/**
 * Custom hook for Dashboard data with optimized caching
 *
 * Benefits:
 * - Stale-while-revalidate for instant perceived performance
 * - Cache warming on mount
 * - Smart invalidation after mutations
 */

import { useCallback, useEffect } from "react";
import { cachedInvoke } from "../utils/api";
import {
  CACHE_TTL,
  invalidateAfterMutation,
  staleWhileRevalidate,
  warmCache,
} from "../utils/cacheStrategies";
import { logError } from "../utils/errorUtils";

interface Job {
  id: number;
  [key: string]: unknown;
}

interface Statistics {
  total_jobs: number;
  high_matches: number;
  average_score: number;
}

interface ScrapingStatus {
  last_scrape: string | null;
  next_scrape: string | null;
  is_running: boolean;
}

interface AutoRefreshConfig {
  enabled: boolean;
  interval_minutes: number;
}

interface DashboardData {
  jobs: Job[];
  statistics: Statistics;
  scrapingStatus: ScrapingStatus;
  config: { auto_refresh?: AutoRefreshConfig };
}

export function useCachedDashboardData() {
  // Warm cache on mount
  useEffect(() => {
    warmCache().catch((err) =>
      logError("Failed to warm cache:", err)
    );
  }, []);

  /**
   * Fetch all dashboard data with stale-while-revalidate
   * Returns cached data immediately if available
   */
  const fetchDashboardData = useCallback(async (): Promise<DashboardData> => {
    const [jobs, statistics, scrapingStatus, config] = await Promise.all([
      staleWhileRevalidate<Job[]>(
        "get_recent_jobs",
        { limit: 50 },
        CACHE_TTL.get_recent_jobs
      ),
      staleWhileRevalidate<Statistics>(
        "get_statistics",
        undefined,
        CACHE_TTL.get_statistics
      ),
      staleWhileRevalidate<ScrapingStatus>(
        "get_scraping_status",
        undefined,
        CACHE_TTL.get_scraping_status
      ),
      staleWhileRevalidate<{ auto_refresh?: AutoRefreshConfig }>(
        "get_config",
        undefined,
        CACHE_TTL.get_config
      ),
    ]);

    return { jobs, statistics, scrapingStatus, config };
  }, []);

  /**
   * Fetch jobs by source with caching
   */
  const fetchJobsBySource = useCallback(async () => {
    return staleWhileRevalidate(
      "get_jobs_by_source",
      undefined,
      CACHE_TTL.get_jobs_by_source
    );
  }, []);

  /**
   * Fetch bookmarked jobs with caching
   */
  const fetchBookmarkedJobs = useCallback(async (limit: number = 50) => {
    return cachedInvoke(
      "get_bookmarked_jobs",
      { limit },
      CACHE_TTL.get_bookmarked_jobs
    );
  }, []);

  /**
   * Invalidate caches after a mutation
   */
  const invalidateAfter = useCallback((mutationCommand: string) => {
    invalidateAfterMutation(mutationCommand);
  }, []);

  return {
    fetchDashboardData,
    fetchJobsBySource,
    fetchBookmarkedJobs,
    invalidateAfter,
  };
}
