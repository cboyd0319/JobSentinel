import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Button,
  Card,
  Badge,
  LoadingSpinner,
  MarketSnapshotCard,
  MarketAlertList,
  LocationHeatmap,
} from "../components";
import { useToast } from "../contexts";
import { logError, getErrorMessage } from "../utils/errorUtils";

// Lazy load TrendChart to defer recharts bundle
const TrendChart = lazy(() => import("../components/TrendChart").then(m => ({ default: m.TrendChart })));

// Chart loading fallback
function ChartFallback() {
  return (
    <Card className="dark:bg-surface-800">
      <div className="h-[250px] flex items-center justify-center">
        <LoadingSpinner message="Loading chart..." />
      </div>
    </Card>
  );
}

// Format relative time for "last updated" display
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

// ============================================================================
// Types - Aligned with Rust backend
// ============================================================================

interface SkillTrend {
  skill_name: string;
  total_jobs: number;
  avg_salary: number | null;
  change_percent: number;
  trend_direction: string;
}

interface CompanyActivity {
  company_name: string;
  total_posted: number;
  avg_active: number;
  hiring_trend: string | null;
  avg_salary: number | null;
  growth_rate: number;
}

interface LocationHeat {
  location: string;
  city: string | null;
  state: string | null;
  total_jobs: number;
  avg_median_salary: number | null;
  remote_percent: number;
}

interface MarketAlert {
  id: number;
  alert_type: string;
  title: string;
  description: string;
  severity: string;
  related_entity: string | null;
  metric_value: number | null;
  metric_change_pct: number | null;
  is_read: boolean;
  created_at: string;
}

interface MarketSnapshot {
  date: string;
  total_jobs: number;
  new_jobs_today: number;
  jobs_filled_today: number;
  avg_salary: number | null;
  median_salary: number | null;
  remote_job_percentage: number;
  top_skill: string | null;
  top_company: string | null;
  top_location: string | null;
  total_companies_hiring: number;
  market_sentiment: string;
}

// ============================================================================
// Tab Types
// ============================================================================

type TabId = "overview" | "skills" | "companies" | "locations" | "alerts";

interface Tab {
  id: TabId;
  label: string;
  icon: string;
  badge?: number;
}

// ============================================================================
// Component Props
// ============================================================================

interface MarketProps {
  onBack: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

export default function Market({ onBack }: MarketProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
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

  const unreadAlertCount = useMemo(() => (alerts ?? []).filter((a) => !a.is_read).length, [alerts]);

  const tabs: Tab[] = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "skills", label: "Skills", icon: "🔧" },
    { id: "companies", label: "Companies", icon: "🏢" },
    { id: "locations", label: "Locations", icon: "📍" },
    { id: "alerts", label: "Alerts", icon: "🔔", badge: unreadAlertCount || undefined },
  ];

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const [skillsData, companiesData, locationsData, alertsData, snapshotData] = await Promise.all([
        invoke<SkillTrend[]>("get_trending_skills", { limit: 15 }),
        invoke<CompanyActivity[]>("get_active_companies", { limit: 15 }),
        invoke<LocationHeat[]>("get_hottest_locations", { limit: 12 }),
        invoke<MarketAlert[]>("get_market_alerts"),
        invoke<MarketSnapshot | null>("get_market_snapshot"),
      ]);

      if (signal?.aborted) return;

      setSkills(skillsData);
      setCompanies(companiesData);
      setLocations(locationsData);
      setAlerts(alertsData);
      setSnapshot(snapshotData);
      setLastFetched(new Date());
    } catch (err) {
      if (signal?.aborted) return;
      logError("Failed to fetch market data:", err);
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error("Failed to load market data", errorMsg);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    
    fetchData(controller.signal);
    
    return () => controller.abort();
  }, [fetchData]);

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      await invoke("run_market_analysis");
      toast.success("Analysis complete", "Market data has been refreshed");
      await fetchData();
    } catch (err) {
      logError("Failed to run analysis:", err);
      toast.error("Analysis failed", getErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleMarkAlertRead = async (id: number) => {
    try {
      await invoke("mark_alert_read", { id });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
      );
    } catch (err) {
      logError("Failed to mark alert as read:", err);
      toast.error("Failed to mark alert", getErrorMessage(err));
    }
  };

  const handleMarkAllAlertsRead = async () => {
    try {
      await invoke("mark_all_alerts_read");
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
      toast.success("All alerts marked as read");
    } catch (err) {
      logError("Failed to mark all alerts:", err);
      toast.error("Failed to mark alerts", getErrorMessage(err));
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <LoadingSpinner message="Loading market intelligence..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center p-6">
        <Card className="dark:bg-surface-800 max-w-md w-full text-center">
          <div className="p-2">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-2">
              Failed to Load Market Data
            </h2>
            <p className="text-surface-600 dark:text-surface-400 mb-6">
              {error}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={onBack}>
                Go Back
              </Button>
              <Button onClick={() => fetchData()}>
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Header */}
      <header className="bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
                aria-label="Go back"
              >
                <BackIcon />
              </button>
              <div>
                <h1 className="font-display text-display-md text-surface-900 dark:text-white">
                  Market Intelligence
                </h1>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Job market trends, company activity, and location insights
                  {lastFetched && (
                    <span className="ml-2 text-surface-400 dark:text-surface-500">
                      · Updated {formatRelativeTime(lastFetched)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button onClick={handleRunAnalysis} loading={analyzing}>
              Refresh Analysis
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-4 overflow-x-auto" role="tablist" aria-label="Market Intelligence sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                id={`${tab.id}-tab`}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-surface-50 dark:bg-surface-900 text-sentinel-600 dark:text-sentinel-400 border-t border-x border-surface-200 dark:border-surface-700"
                    : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white"
                }`}
              >
                <span aria-hidden="true">{tab.icon}</span>
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <Badge variant="alert" className="ml-1">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <MarketSnapshotCard snapshot={snapshot} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Suspense fallback={<ChartFallback />}>
                <TrendChart
                  data={skills.slice(0, 8)}
                  type="bar"
                  title="Skill Demand"
                  xKey="skill_name"
                  yKey="total_jobs"
                  yLabel="Jobs"
                  color="#6366f1"
                  emptyMessage="Run analysis to see skill trends"
                />
              </Suspense>
              <Suspense fallback={<ChartFallback />}>
                <TrendChart
                  data={companies.slice(0, 8)}
                  type="bar"
                  title="Company Hiring Activity"
                  xKey="company_name"
                  yKey="total_posted"
                  yLabel="Jobs Posted"
                  color="#10b981"
                  emptyMessage="Run analysis to see company activity"
                />
              </Suspense>
            </div>

            <LocationHeatmap locations={locations} />

            {unreadAlertCount > 0 && (
              <Card className="dark:bg-surface-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-display-sm text-surface-900 dark:text-white">
                    Recent Alerts ({unreadAlertCount} unread)
                  </h3>
                  <Button variant="ghost" onClick={() => setActiveTab("alerts")}>
                    View All
                  </Button>
                </div>
                <MarketAlertList
                  alerts={alerts.slice(0, 3)}
                  onMarkRead={handleMarkAlertRead}
                />
              </Card>
            )}
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === "skills" && (
          <div className="space-y-6">
            <Suspense fallback={<ChartFallback />}>
              <TrendChart
                data={skills}
                type="bar"
                title="Skills by Demand"
                xKey="skill_name"
                yKey="total_jobs"
                yLabel="Total Jobs"
                color="#6366f1"
                height={350}
                emptyMessage="No skill data available. Run analysis to gather insights."
              />
            </Suspense>

            <Card className="dark:bg-surface-800">
              <h3 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
                Skill Trends
              </h3>
              {skills.length === 0 ? (
                <p className="text-surface-500 dark:text-surface-400 text-center py-8">
                  No skill data available yet. Run analysis to gather insights.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {skills.map((skill, index) => (
                    <div
                      key={skill.skill_name}
                      className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-full flex items-center justify-center text-sm font-medium text-sentinel-600 dark:text-sentinel-400">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-surface-800 dark:text-surface-200">
                            {skill.skill_name}
                          </p>
                          <p className="text-sm text-surface-500 dark:text-surface-400">
                            {skill.total_jobs.toLocaleString()} jobs
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <TrendIndicator
                          direction={skill.trend_direction}
                          percent={skill.change_percent}
                        />
                        {skill.avg_salary && (
                          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                            {formatCurrency(skill.avg_salary)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Companies Tab */}
        {activeTab === "companies" && (
          <div className="space-y-6">
            <Suspense fallback={<ChartFallback />}>
              <TrendChart
                data={companies}
                type="bar"
                title="Companies by Hiring Volume"
                xKey="company_name"
                yKey="total_posted"
                yLabel="Jobs Posted"
                color="#10b981"
                height={350}
                emptyMessage="No company data available. Run analysis to gather insights."
              />
            </Suspense>

            <Card className="dark:bg-surface-800">
              <h3 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
                Hiring Activity
              </h3>
              {companies.length === 0 ? (
                <p className="text-surface-500 dark:text-surface-400 text-center py-8">
                  No company data available yet. Run analysis to gather insights.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-200 dark:border-surface-700">
                        <th className="text-left py-3 px-4 font-medium text-surface-500 dark:text-surface-400">
                          Company
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-surface-500 dark:text-surface-400">
                          Jobs Posted
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-surface-500 dark:text-surface-400">
                          Avg Active
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-surface-500 dark:text-surface-400">
                          Avg Salary
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-surface-500 dark:text-surface-400">
                          Growth
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map((company) => (
                        <tr
                          key={company.company_name}
                          className="border-b border-surface-100 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800"
                        >
                          <td className="py-3 px-4 font-medium text-surface-900 dark:text-white">
                            {company.company_name}
                          </td>
                          <td className="py-3 px-4 text-right text-surface-700 dark:text-surface-300">
                            {company.total_posted}
                          </td>
                          <td className="py-3 px-4 text-right text-surface-700 dark:text-surface-300">
                            {company.avg_active.toFixed(0)}
                          </td>
                          <td className="py-3 px-4 text-right text-surface-700 dark:text-surface-300">
                            {formatCurrency(company.avg_salary)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <TrendIndicator
                              direction={company.growth_rate > 5 ? "up" : company.growth_rate < -5 ? "down" : "flat"}
                              percent={company.growth_rate}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Locations Tab */}
        {activeTab === "locations" && (
          <LocationHeatmap locations={locations} />
        )}

        {/* Alerts Tab */}
        {activeTab === "alerts" && (
          <Card className="dark:bg-surface-800">
            <h3 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
              Market Alerts
            </h3>
            <MarketAlertList
              alerts={alerts}
              onMarkRead={handleMarkAlertRead}
              onMarkAllRead={handleMarkAllAlertsRead}
            />
          </Card>
        )}
      </main>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

interface TrendIndicatorProps {
  direction: string;
  percent: number;
}

function TrendIndicator({ direction, percent }: TrendIndicatorProps) {
  const getIcon = () => {
    switch ((direction ?? "stable").toLowerCase()) {
      case "up":
        return "↑";
      case "down":
        return "↓";
      default:
        return "→";
    }
  };

  const getColor = () => {
    if (percent > 0) return "text-green-600 dark:text-green-400";
    if (percent < 0) return "text-red-600 dark:text-red-400";
    return "text-surface-500 dark:text-surface-400";
  };

  return (
    <span className={`text-sm font-medium ${getColor()}`}>
      {getIcon()} {percent > 0 ? "+" : ""}
      {percent.toFixed(1)}%
    </span>
  );
}
