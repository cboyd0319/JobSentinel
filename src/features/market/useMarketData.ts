import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../shared/toast/useToast";
import { safeInvoke, safeInvokeWithToast } from "../../shared/tauri/commandClient";
import { getMarketDataErrorCopy } from "./errorCopy";
import {
  marketDataHasInputs,
  type CompanyActivity,
  type LocationHeat,
  type MarketAlert,
  type MarketDataResult,
  type MarketSnapshot,
  type SkillTrend,
} from "./model";

export function useMarketData() {
  const [skills, setSkills] = useState<SkillTrend[]>([]);
  const [companies, setCompanies] = useState<CompanyActivity[]>([]);
  const [locations, setLocations] = useState<LocationHeat[]>([]);
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const toast = useToast();

  const fetchData = useCallback(async (signal?: AbortSignal): Promise<MarketDataResult | null> => {
    try {
      setLoading(true);
      setError(null);
      const [skillsData, companiesData, locationsData, alertsData, snapshotData] = await Promise.all([
        safeInvoke<SkillTrend[]>("get_trending_skills", { limit: 15 }, { logContext: "Get trending skills" }),
        safeInvoke<CompanyActivity[]>("get_active_companies", { limit: 15 }, { logContext: "Get active companies" }),
        safeInvoke<LocationHeat[]>("get_hottest_locations", { limit: 12 }, { logContext: "Get hottest locations" }),
        safeInvoke<MarketAlert[]>("get_market_alerts", {}, { logContext: "Get hiring alerts" }),
        safeInvoke<MarketSnapshot | null>("get_market_snapshot", {}, { logContext: "Get market snapshot" }),
      ]);

      if (signal?.aborted) return null;

      setSkills(skillsData);
      setCompanies(companiesData);
      setLocations(locationsData);
      setAlerts(alertsData);
      setSnapshot(snapshotData);
      setLastFetched(new Date());
      return { skillsData, companiesData, locationsData, alertsData, snapshotData };
    } catch (caught: unknown) {
      if (signal?.aborted) return null;
      const safeError = getMarketDataErrorCopy(caught);
      setError(safeError.inlineMessage);
      toast.error(safeError.toastTitle, safeError.toastMessage);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
    return null;
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      await safeInvokeWithToast("run_market_analysis", {}, toast, { logContext: "Run market analysis" });
      const refreshed = await fetchData();
      if (!refreshed) return;

      if (marketDataHasInputs(refreshed)) {
        toast.success("Hiring trends refreshed", "Current job trends are up to date.");
      } else {
        toast.info("No job data yet", "Turn on job sources or import jobs, then refresh trends again.");
      }
    } catch {
      // The invocation helper already reports the error.
    } finally {
      setAnalyzing(false);
    }
  };

  const markAlertRead = async (id: number) => {
    try {
      await safeInvokeWithToast("mark_alert_read", { id }, toast, { logContext: "Mark alert as read" });
      setAlerts((current) => current.map((alert) => (alert.id === id ? { ...alert, is_read: true } : alert)));
    } catch {
      // The invocation helper already reports the error.
    }
  };

  const markAllAlertsRead = async () => {
    try {
      await safeInvokeWithToast("mark_all_alerts_read", {}, toast, { logContext: "Mark all alerts as read" });
      setAlerts((current) => current.map((alert) => ({ ...alert, is_read: true })));
      toast.success("All alerts marked as read");
    } catch {
      // The invocation helper already reports the error.
    }
  };

  const unreadAlertCount = useMemo(() => alerts.filter((alert) => !alert.is_read).length, [alerts]);
  const hasTrendInputs = marketDataHasInputs({
    skillsData: skills,
    companiesData: companies,
    locationsData: locations,
    snapshotData: snapshot,
  });

  return {
    alerts,
    analyzing,
    companies,
    error,
    fetchData,
    hasTrendInputs,
    lastFetched,
    loading,
    locations,
    markAlertRead,
    markAllAlertsRead,
    runAnalysis,
    skills,
    snapshot,
    unreadAlertCount,
  };
}
