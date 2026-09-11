// Dashboard manual-search orchestration with stale UI-delivery suppression.

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useToast } from "../../../shared/toast/useToast";
import { invalidateCacheByCommand, safeInvoke } from "../../../platform/tauri";
import {
  notifyScrapingComplete,
  selectNotificationCandidates,
} from "../notifications";
import { getDashboardSearchErrorCopy } from "../dashboardErrorCopy";
import type {
  DashboardPreferences,
  Job,
  ScrapingStatus,
  Statistics,
} from "../types";

interface DashboardManualSearchOptions {
  jobs: Job[];
  showSettings?: boolean;
  setAnyJobSourceEnabled: Dispatch<SetStateAction<boolean | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setJobs: Dispatch<SetStateAction<Job[]>>;
  setScrapingStatus: Dispatch<SetStateAction<ScrapingStatus>>;
  setStatistics: Dispatch<SetStateAction<Statistics>>;
}

export function useDashboardManualSearch({
  jobs,
  showSettings = false,
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
  const activeSearchRequestRef = useRef<number | null>(null);
  const deliveryGenerationRef = useRef(0);
  const mountedRef = useRef(true);
  const toast = useToast();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      deliveryGenerationRef.current += 1;
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    deliveryGenerationRef.current += 1;
  }, [showSettings]);

  const handleSearchNow = async () => {
    if (showSettings) return;
    if (searchCooldown || activeSearchRequestRef.current !== null) {
      toast.info(
        "Please wait",
        `Search available in ${cooldownSeconds} seconds`,
      );
      return;
    }

    const requestId = deliveryGenerationRef.current + 1;
    const deliveryGeneration = requestId;
    deliveryGenerationRef.current = deliveryGeneration;
    activeSearchRequestRef.current = requestId;
    const canDeliver = () => (
      mountedRef.current && deliveryGenerationRef.current === deliveryGeneration
    );

    try {
      try {
        const preferences = await safeInvoke<DashboardPreferences>(
          "get_dashboard_preferences",
        );
        if (!canDeliver()) return;
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
        if (!canDeliver()) return;
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
      if (!canDeliver()) return;

      invalidateCacheByCommand("get_recent_jobs");
      invalidateCacheByCommand("get_statistics");
      invalidateCacheByCommand("get_scraping_status");

      const [jobsData, statsData, statusData] = await Promise.all([
        safeInvoke<Job[]>("get_recent_jobs", { limit: 50 }),
        safeInvoke<Statistics>("get_statistics"),
        safeInvoke<ScrapingStatus>("get_scraping_status"),
      ]);
      if (!canDeliver()) return;
      const notificationCandidates = selectNotificationCandidates(jobs, jobsData);
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

      if (notificationCandidates.length > 0) {
        void notifyScrapingComplete(notificationCandidates);
      }

      cooldownTimeoutRef.current = setTimeout(() => {
        setSearchCooldown(false);
        setCooldownSeconds(0);
        cooldownTimeoutRef.current = null;
      }, 30_000);
    } catch (error: unknown) {
      if (!canDeliver()) return;
      const safeError = getDashboardSearchErrorCopy(error);
      setError(safeError.message);
      toast.error(safeError.title, safeError.message);
      setSearchCooldown(false);
      setCooldownSeconds(0);
    } finally {
      if (activeSearchRequestRef.current === requestId) {
        activeSearchRequestRef.current = null;
        if (mountedRef.current) {
          setSearching(false);
          if (!canDeliver()) {
            if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
            if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
            cooldownIntervalRef.current = null;
            cooldownTimeoutRef.current = null;
            setSearchCooldown(false);
            setCooldownSeconds(0);
          }
        }
      }
    }
  };

  return {
    cooldownSeconds,
    handleSearchNow,
    searchCooldown,
    searching,
  };
}
