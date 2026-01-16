import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Card, Badge, LoadingSpinner } from "../components";
import { useToast } from "../contexts";
import { logError, getErrorMessage } from "../utils/errorUtils";

interface SkillTrend {
  skill: string;
  current_demand: number;
  change_percent: number;
  trend_direction: string;
}

interface CompanyActivity {
  company: string;
  job_count: number;
  avg_salary: number | null;
  growth_rate: number;
}

interface LocationHeat {
  location: string;
  job_count: number;
  avg_salary: number | null;
  remote_percent: number;
}

interface MarketAlert {
  id: number;
  alert_type: string;
  message: string;
  severity: string;
  created_at: string;
}

interface MarketProps {
  onBack: () => void;
}

export default function Market({ onBack }: MarketProps) {
  const [skills, setSkills] = useState<SkillTrend[]>([]);
  const [companies, setCompanies] = useState<CompanyActivity[]>([]);
  const [locations, setLocations] = useState<LocationHeat[]>([]);
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [skillsData, companiesData, locationsData, alertsData] = await Promise.all([
        invoke<SkillTrend[]>("get_trending_skills", { limit: 10 }),
        invoke<CompanyActivity[]>("get_active_companies", { limit: 10 }),
        invoke<LocationHeat[]>("get_hottest_locations", { limit: 10 }),
        invoke<MarketAlert[]>("get_market_alerts"),
      ]);

      setSkills(skillsData);
      setCompanies(companiesData);
      setLocations(locationsData);
      setAlerts(alertsData);
    } catch (err) {
      logError("Failed to fetch market data:", err);
      toast.error("Failed to load market data", getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      await invoke("run_market_analysis");
      toast.success("Analysis complete", "Market data has been refreshed");
      fetchData();
    } catch (err) {
      logError("Failed to run analysis:", err);
      toast.error("Analysis failed", getErrorMessage(err));
    } finally {
      setAnalyzing(false);
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

  const getTrendIcon = (direction: string) => {
    switch (direction.toLowerCase()) {
      case "up":
        return <TrendUpIcon className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendDownIcon className="w-4 h-4 text-red-500" />;
      default:
        return <TrendFlatIcon className="w-4 h-4 text-surface-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return "bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "medium":
        return "bg-alert-100 dark:bg-alert-900/20 border-alert-200 dark:border-alert-800";
      default:
        return "bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading market intelligence..." />;
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
                </p>
              </div>
            </div>
            <Button onClick={handleRunAnalysis} loading={analyzing}>
              Refresh Analysis
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <AlertIcon className="w-5 h-5 text-alert-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-surface-800 dark:text-surface-200">
                      {alert.alert_type}
                    </p>
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                      {alert.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trending Skills */}
          <Card className="dark:bg-surface-800">
            <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
              Trending Skills
            </h2>

            {skills.length === 0 ? (
              <p className="text-surface-500 dark:text-surface-400 text-center py-8">
                No skill data available yet. Run analysis to gather insights.
              </p>
            ) : (
              <div className="space-y-3">
                {skills.map((skill, index) => (
                  <div
                    key={skill.skill}
                    className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-full flex items-center justify-center text-xs font-medium text-sentinel-600 dark:text-sentinel-400">
                        {index + 1}
                      </span>
                      <span className="font-medium text-surface-800 dark:text-surface-200">
                        {skill.skill}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(skill.trend_direction)}
                      <span
                        className={`text-sm ${
                          skill.change_percent > 0
                            ? "text-green-600 dark:text-green-400"
                            : skill.change_percent < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-surface-500 dark:text-surface-400"
                        }`}
                      >
                        {skill.change_percent > 0 ? "+" : ""}
                        {skill.change_percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Active Companies */}
          <Card className="dark:bg-surface-800">
            <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
              Most Active Hiring Companies
            </h2>

            {companies.length === 0 ? (
              <p className="text-surface-500 dark:text-surface-400 text-center py-8">
                No company data available yet. Run analysis to gather insights.
              </p>
            ) : (
              <div className="space-y-3">
                {companies.map((company) => (
                  <div
                    key={company.company}
                    className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-surface-800 dark:text-surface-200">
                        {company.company}
                      </p>
                      <p className="text-sm text-surface-500 dark:text-surface-400">
                        {company.job_count} open positions
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200">
                        {formatCurrency(company.avg_salary)}
                      </p>
                      <p className="text-xs text-surface-500 dark:text-surface-400">avg salary</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Hot Locations */}
          <Card className="lg:col-span-2 dark:bg-surface-800">
            <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
              Job Market by Location
            </h2>

            {locations.length === 0 ? (
              <p className="text-surface-500 dark:text-surface-400 text-center py-8">
                No location data available yet. Run analysis to gather insights.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map((loc) => (
                  <div
                    key={loc.location}
                    className="p-4 border border-surface-200 dark:border-surface-700 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-surface-800 dark:text-surface-200">
                        {loc.location}
                      </h3>
                      <Badge variant="sentinel">{loc.job_count} jobs</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-surface-500 dark:text-surface-400">Avg Salary</p>
                        <p className="font-medium text-surface-800 dark:text-surface-200">
                          {formatCurrency(loc.avg_salary)}
                        </p>
                      </div>
                      <div>
                        <p className="text-surface-500 dark:text-surface-400">Remote</p>
                        <p className="font-medium text-surface-800 dark:text-surface-200">
                          {loc.remote_percent.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function TrendUpIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function TrendDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  );
}

function TrendFlatIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
    </svg>
  );
}
