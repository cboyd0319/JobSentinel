/** Loads dashboard jobs, status, and current search-preference context. */

import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { useToast } from "../../../shared/toast/useToast";
import { cachedInvoke, invalidateCacheByCommand } from "../../../platform/tauri";
import { listen } from "../../../platform/tauri/events";
import { logError } from "../../../shared/errorReporting/logger";
import { getDashboardLoadErrorMessage } from "../dashboardErrorCopy";
import type {
  DashboardPreferences,
  Job,
  ScrapingStatus,
  Statistics,
} from "../types";

interface DashboardDataLifecycleOptions {
  autoRefreshEnabled: boolean;
  jobs: Job[];
  setAnyJobSourceEnabled: Dispatch<SetStateAction<boolean | null>>;
  setAutoRefreshEnabled: (enabled: boolean) => void;
  setAutoRefreshInterval: (minutes: number) => void;
  setError: Dispatch<SetStateAction<string | null>>;
  setJobs: Dispatch<SetStateAction<Job[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setSalaryFloorUsd: Dispatch<SetStateAction<number | null>>;
  setSearchCountry: Dispatch<SetStateAction<string | null>>;
  setScrapingStatus: Dispatch<SetStateAction<ScrapingStatus>>;
  setStatistics: Dispatch<SetStateAction<Statistics>>;
}

export function useDashboardDataLifecycle({
  autoRefreshEnabled,
  jobs,
  setAnyJobSourceEnabled,
  setAutoRefreshEnabled,
  setAutoRefreshInterval,
  setError,
  setJobs,
  setLoading,
  setSalaryFloorUsd,
  setSearchCountry,
  setScrapingStatus,
  setStatistics,
}: DashboardDataLifecycleOptions) {
  const fetchDataRef = useRef<(() => Promise<void>) | null>(null);
  const loadGeneration = useRef(0);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    const generation = ++loadGeneration.current;
    try {
      setLoading(true);
      setError(null);

      const [jobsData, statsData, statusData] = await Promise.all([
        cachedInvoke<Job[]>("get_recent_jobs", { limit: 50 }, 10_000),
        cachedInvoke<Statistics>("get_statistics", undefined, 30_000),
        cachedInvoke<ScrapingStatus>("get_scraping_status", undefined, 10_000),
      ]);
      if (generation !== loadGeneration.current) return;

      setJobs(jobsData);
      setStatistics(statsData);
      setScrapingStatus(statusData);

      try {
        const preferences = await cachedInvoke<DashboardPreferences>(
          "get_dashboard_preferences",
          undefined,
          60_000,
        );
        if (generation !== loadGeneration.current) return;
        if (preferences?.autoRefresh) {
          setAutoRefreshEnabled(preferences.autoRefresh.enabled);
          setAutoRefreshInterval(preferences.autoRefresh.interval_minutes || 30);
        }
        if (typeof preferences?.salaryFloorUsd === "number") {
          setSalaryFloorUsd(preferences.salaryFloorUsd);
        }
        if (typeof preferences?.anyJobSourceEnabled === "boolean") {
          setAnyJobSourceEnabled(preferences.anyJobSourceEnabled);
        }
        setSearchCountry(typeof preferences?.searchCountry === "string" && /^[A-Z]{2}$/.test(preferences.searchCountry)
          ? preferences.searchCountry : null);
      } catch {
        // Preferences may be unavailable during startup; use defaults.
      }
    } catch (error: unknown) {
      if (generation !== loadGeneration.current) return;
      logError("Failed to fetch dashboard data:", error);
      setError(getDashboardLoadErrorMessage(error));
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [
    setAnyJobSourceEnabled,
    setAutoRefreshEnabled,
    setAutoRefreshInterval,
    setError,
    setJobs,
    setLoading,
    setSalaryFloorUsd,
    setSearchCountry,
    setScrapingStatus,
    setStatistics,
  ]);

  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  useEffect(() => {
    void fetchData();
    return () => { loadGeneration.current += 1; };
  }, [fetchData]);

  useEffect(() => {
    const unlisten = listen<{ jobs_found: number; jobs_new: number }>(
      "jobs-updated",
      (event) => {
        const { jobs_new: newJobCount } = event.payload;
        if (newJobCount > 0) {
          toast.success(
            "New jobs found!",
            `${newJobCount} new job${newJobCount > 1 ? "s" : ""} added`,
          );
          invalidateCacheByCommand("get_recent_jobs");
          invalidateCacheByCommand("get_statistics");
          void fetchData();
        }
      },
    );

    return () => {
      void unlisten.then((stopListening) => stopListening());
    };
  }, [fetchData, toast]);

  useEffect(() => {
    if (autoRefreshEnabled) return;

    const initialRefresh = setTimeout(() => {
      if (jobs.length === 0 && fetchDataRef.current) {
        void fetchDataRef.current();
      }
    }, 30_000);

    return () => clearTimeout(initialRefresh);
  }, [autoRefreshEnabled, jobs.length]);

  return { fetchData, fetchDataRef };
}
