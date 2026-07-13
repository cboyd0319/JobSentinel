import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useToast } from "../../../contexts";
import { invalidateCacheByCommand, safeInvoke } from "../../../utils/api";
import { notifyScrapingComplete } from "../../../utils/notifications";
import { getDashboardSearchErrorCopy } from "../dashboardErrorCopy";
import type {
  DashboardPreferences,
  Job,
  ScrapingStatus,
  Statistics,
} from "../types";

interface DashboardManualSearchOptions {
  setAnyJobSourceEnabled: Dispatch<SetStateAction<boolean | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setJobs: Dispatch<SetStateAction<Job[]>>;
  setScrapingStatus: Dispatch<SetStateAction<ScrapingStatus>>;
  setStatistics: Dispatch<SetStateAction<Statistics>>;
}

export function useDashboardManualSearch({
  setAnyJobSourceEnabled,
  setError,
  setJobs,
  setScrapingStatus,
  setStatistics,
}: DashboardManualSearchOptions) {
  const [searching, setSearching] = useState(false);
  const [searchCooldown, setSearchCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  useEffect(() => () => {
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
  }, []);

  const handleSearchNow = async () => {
    if (searchCooldown) {
      toast.info(
        "Please wait",
        `Search available in ${cooldownSeconds} seconds`,
      );
      return;
    }

    try {
      try {
        const preferences = await safeInvoke<DashboardPreferences>(
          "get_dashboard_preferences",
        );
        if (!preferences.anyJobSourceEnabled) {
          setAnyJobSourceEnabled(false);
          toast.warning(
            "Turn on a job source first",
            "Open Settings, turn on a job source, then search again.",
          );
          return;
        }
        setAnyJobSourceEnabled(true);
      } catch {
        // Preferences check failed; proceed with search anyway.
      }

      setSearching(true);
      setSearchCooldown(true);
      setCooldownSeconds(30);
      setError(null);
      toast.info("Checking job sources", "This may take a moment");

      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);

      cooldownIntervalRef.current = setInterval(() => {
        setCooldownSeconds((previous) => {
          if (previous <= 1) {
            if (cooldownIntervalRef.current) {
              clearInterval(cooldownIntervalRef.current);
              cooldownIntervalRef.current = null;
            }
            return 0;
          }
          return previous - 1;
        });
      }, 1_000);

      await safeInvoke("search_jobs", undefined, {
        logContext: "Manual job search",
      });

      invalidateCacheByCommand("get_recent_jobs");
      invalidateCacheByCommand("get_statistics");
      invalidateCacheByCommand("get_scraping_status");

      const [jobsData, statsData, statusData] = await Promise.all([
        safeInvoke<Job[]>("get_recent_jobs", { limit: 50 }),
        safeInvoke<Statistics>("get_statistics"),
        safeInvoke<ScrapingStatus>("get_scraping_status"),
      ]);
      setJobs(jobsData);
      setStatistics(statsData);
      setScrapingStatus(statusData);
      if (statsData.total_jobs > 0) {
        toast.success("Job check complete", `Found ${statsData.total_jobs} jobs`);
      } else {
        toast.info(
          "No jobs found yet",
          "Turn on more sources, broaden your search, or import a job posting.",
        );
      }

      if (statsData.high_matches > 0) {
        notifyScrapingComplete(jobsData.length, statsData.high_matches);
      }

      cooldownTimeoutRef.current = setTimeout(() => {
        setSearchCooldown(false);
        setCooldownSeconds(0);
        cooldownTimeoutRef.current = null;
      }, 30_000);
    } catch (error: unknown) {
      const safeError = getDashboardSearchErrorCopy(error);
      setError(safeError.message);
      toast.error(safeError.title, safeError.message);
      setSearchCooldown(false);
      setCooldownSeconds(0);
    } finally {
      setSearching(false);
    }
  };

  return {
    cooldownSeconds,
    handleSearchNow,
    searchCooldown,
    searching,
  };
}
