import type { MarketAlert } from "./model";

export type MockMarketAlert = MarketAlert;

export function getDefaultMarketAlerts(): MockMarketAlert[] {
  return [
    {
      id: 1,
      alert_type: "skill_surge",
      title: "Customer support demand is rising",
      description: "Customer support and client success postings are up across remote and hybrid roles.",
      severity: "warning",
      related_entity: "Customer Support",
      metric_value: 384,
      metric_change_pct: 18,
      is_read: false,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 2,
      alert_type: "location_boom",
      title: "Remote roles are expanding",
      description: "Remote listings now represent a larger share of active job postings.",
      severity: "info",
      related_entity: "Remote",
      metric_value: 42,
      metric_change_pct: 8.5,
      is_read: false,
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
}

export function getMockTrendingSkills() {
  return [
    { skill_name: "Customer Support", total_jobs: 512, avg_salary: 62000, change_percent: 24, trend_direction: "up" },
    { skill_name: "Project Coordination", total_jobs: 245, avg_salary: 74000, change_percent: 18, trend_direction: "up" },
    { skill_name: "Patient Care", total_jobs: 334, avg_salary: 68000, change_percent: 15, trend_direction: "stable" },
    { skill_name: "Bilingual Communication", total_jobs: 189, avg_salary: 64000, change_percent: 12, trend_direction: "up" },
    { skill_name: "Data Reporting", total_jobs: 276, avg_salary: 88000, change_percent: 9, trend_direction: "stable" },
  ];
}

export function getMockActiveCompanies() {
  return [
    { company_name: "CareBridge Health", total_posted: 45, avg_active: 15, hiring_trend: "up", avg_salary: 76000, growth_rate: 25 },
    { company_name: "Metro Learning Center", total_posted: 22, avg_active: 8, hiring_trend: "up", avg_salary: 68000, growth_rate: 18 },
    { company_name: "Northstar Logistics", total_posted: 78, avg_active: 22, hiring_trend: "stable", avg_salary: 72000, growth_rate: 15 },
  ];
}

export function getMockHottestLocations() {
  return [
    { location: "Chicago, IL", city: "Chicago", state: "IL", total_jobs: 245, avg_median_salary: 82000, remote_percent: 35 },
    { location: "Phoenix, AZ", city: "Phoenix", state: "AZ", total_jobs: 198, avg_median_salary: 71000, remote_percent: 28 },
    { location: "Remote", city: null, state: null, total_jobs: 312, avg_median_salary: 78000, remote_percent: 100 },
    { location: "Atlanta, GA", city: "Atlanta", state: "GA", total_jobs: 156, avg_median_salary: 76000, remote_percent: 42 },
  ];
}

export function getMockMarketSnapshot() {
  return {
    date: new Date().toISOString(),
    total_jobs: 911,
    new_jobs_today: 47,
    jobs_filled_today: 12,
    avg_salary: 76000,
    median_salary: 72000,
    remote_job_percentage: 42,
    top_skill: "Customer Support",
    top_company: "CareBridge Health",
    jobs_30d_change: 8.5,
    salary_30d_change: 2.1,
    market_sentiment: "neutral",
  };
}
