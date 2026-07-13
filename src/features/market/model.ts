export interface SkillTrend {
  skill_name: string;
  total_jobs: number;
  avg_salary: number | null;
  change_percent: number;
  trend_direction: string;
}

export interface CompanyActivity {
  company_name: string;
  total_posted: number;
  avg_active: number;
  hiring_trend: string | null;
  avg_salary: number | null;
  growth_rate: number;
}

export interface LocationHeat {
  location: string;
  city: string | null;
  state: string | null;
  total_jobs: number;
  avg_median_salary: number | null;
  remote_percent: number;
}

export interface MarketAlert {
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

export interface MarketSnapshot {
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

export interface MarketDataResult {
  skillsData: SkillTrend[];
  companiesData: CompanyActivity[];
  locationsData: LocationHeat[];
  alertsData: MarketAlert[];
  snapshotData: MarketSnapshot | null;
}

export type MarketTabId = "overview" | "skills" | "companies" | "locations" | "alerts";

export function marketDataHasInputs(
  data: Pick<MarketDataResult, "skillsData" | "companiesData" | "locationsData" | "snapshotData">,
) {
  return (
    data.skillsData.length > 0 ||
    data.companiesData.length > 0 ||
    data.locationsData.length > 0 ||
    (data.snapshotData?.total_jobs ?? 0) > 0 ||
    (data.snapshotData?.total_companies_hiring ?? 0) > 0
  );
}
