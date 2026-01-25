// Dashboard Auto-Refresh Hook
// Manages auto-refresh timer logic and countdown display

import { useState, useEffect } from "react";
import type { Job, Statistics, ScrapingStatus } from "../DashboardTypes";
import { useToast } from "../../contexts";
import { notifyScrapingComplete } from "../../utils/notifications";
import { safeInvoke, invalidateCacheByCommand } from "../../utils/api";

interface AutoRefreshHookProps {
  searching: boolean;
  showSettings: boolean;
  statistics: Statistics;
  onDataUpdate: (data: { jobs: Job[]; stats: Statistics; status: ScrapingStatus }) => void;
}

export function useDashboardAutoRefresh({
  searching,
  showSettings,
  statistics,
  onDataUpdate,
}: AutoRefreshHookProps) {
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(30); // minutes
  const [nextRefreshTime, setNextRefreshTime] = useState<Date | null>(null);
  // countdownTick forces re-renders to update countdown display - value is intentionally unused
  const [, setCountdownTick] = useState(0);
  const toast = useToast();

  // Countdown display update effect - refreshes every second when auto-refresh is enabled
  useEffect(() => {
    if (!autoRefreshEnabled || !nextRefreshTime) return;

    const tickInterval = setInterval(() => {
      setCountdownTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(tickInterval);
  }, [autoRefreshEnabled, nextRefreshTime]);

  // Auto-refresh effect - runs at configured interval when enabled
  useEffect(() => {
    if (!autoRefreshEnabled || searching) {
      setNextRefreshTime(null);
      return;
    }

    const intervalMs = autoRefreshInterval * 60 * 1000;

    // Set initial next refresh time
    setNextRefreshTime(new Date(Date.now() + intervalMs));

    const performAutoRefresh = async () => {
      // Don't refresh if currently searching or settings modal is open
      if (searching || showSettings) {
        setNextRefreshTime(new Date(Date.now() + intervalMs));
        return;
      }

      try {
        toast.info("Auto-refreshing...", "Scanning for new jobs");
        await safeInvoke("search_jobs", {}, {
          logContext: "Auto-refresh search jobs",
          silent: true // Silent mode - don't log failures for auto-refresh
        });

        // Invalidate cache after mutation
        invalidateCacheByCommand("get_recent_jobs");
        invalidateCacheByCommand("get_statistics");
        invalidateCacheByCommand("get_scraping_status");

        // Fetch fresh data
        const [jobsData, statsData, statusData] = await Promise.all([
          safeInvoke<Job[]>("get_recent_jobs", { limit: 50 }, { logContext: "Auto-refresh get jobs", silent: true }),
          safeInvoke<Statistics>("get_statistics", {}, { logContext: "Auto-refresh get stats", silent: true }),
          safeInvoke<ScrapingStatus>("get_scraping_status", {}, { logContext: "Auto-refresh get status", silent: true }),
        ]);

        onDataUpdate({
          jobs: jobsData,
          stats: statsData,
          status: statusData,
        });

        // Check for new high matches
        if (statsData.high_matches > statistics.high_matches) {
          const newCount = statsData.high_matches - statistics.high_matches;
          toast.success("New matches found!", `${newCount} new high-match jobs`);
          notifyScrapingComplete(jobsData.length, newCount);
        }
      } catch {
        // Silent fail for auto-refresh - don't show error toast
      }

      // Schedule next refresh
      setNextRefreshTime(new Date(Date.now() + intervalMs));
    };

    const intervalId = setInterval(performAutoRefresh, intervalMs);

    return () => {
      clearInterval(intervalId);
      setNextRefreshTime(null);
    };
  }, [autoRefreshEnabled, autoRefreshInterval, searching, showSettings, statistics.high_matches, toast, onDataUpdate]);

  const formatTimeUntil = (date: Date) => {
    const now = Date.now();
    const diff = date.getTime() - now;
    if (diff <= 0) return "now";

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return {
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    autoRefreshInterval,
    setAutoRefreshInterval,
    nextRefreshTime,
    formatTimeUntil,
  };
}
