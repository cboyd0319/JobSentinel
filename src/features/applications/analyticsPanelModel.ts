import { readStorageValue, removeStorageValue, writeStorageValue } from "../../shared/browserStorage";
import { getJobSourceGuidance } from "../../utils/sourceLabels";

export interface StatusCounts {
  to_apply: number;
  applied: number;
  screening_call: number;
  phone_interview: number;
  technical_interview: number;
  onsite_interview: number;
  offer_received: number;
  offer_accepted: number;
  offer_rejected: number;
  rejected: number;
  ghosted: number;
  withdrawn: number;
}

export interface WeeklyData {
  week: string;
  count: number;
}

export interface SourceStats {
  source: string;
  count: number;
  response_rate: number;
}

export interface CompanyResponseStats {
  company: string;
  applications: number;
  responses: number;
  avg_days: number | null;
}

export interface ApplicationStats {
  total: number;
  by_status: StatusCounts;
  response_rate: number;
  offer_rate: number;
  weekly_applications: WeeklyData[];
  by_source?: SourceStats[];
  avg_response_days?: number;
  company_response_times?: CompanyResponseStats[];
}

export interface WeeklyGoal {
  target: number;
  weekStart: string;
}

export type DateRange = "all" | "30" | "60" | "90";

const WEEKLY_GOALS_KEY = "jobsentinel_weekly_goals";

export const STATUS_COLORS: Record<string, string> = {
  to_apply: "#6B7280",
  applied: "#3B82F6",
  screening_call: "#8B5CF6",
  phone_interview: "#8B5CF6",
  technical_interview: "#6366F1",
  onsite_interview: "#06B6D4",
  offer_received: "#10B981",
  offer_accepted: "#059669",
  offer_rejected: "#F97316",
  rejected: "#EF4444",
  ghosted: "#9CA3AF",
  withdrawn: "#F59E0B",
};

export const STATUS_LABELS: Record<string, string> = {
  to_apply: "To Apply",
  applied: "Applied",
  screening_call: "Screening",
  phone_interview: "Phone",
  technical_interview: "Skills",
  onsite_interview: "Onsite",
  offer_received: "Offer",
  offer_accepted: "Accepted",
  offer_rejected: "Declined",
  rejected: "Not Selected",
  ghosted: "No Response",
  withdrawn: "Withdrawn",
};

export const SOURCE_COLORS: Record<string, string> = {
  linkedin: "#0A66C2",
  greenhouse: "#3AB549",
  lever: "#5B21B6",
  jobswithgpt: "#F59E0B",
  glassdoor: "#00A264",
  direct: "#6B7280",
  other: "#9CA3AF",
};

export function getWeeklyGoal(): WeeklyGoal | null {
  try {
    const stored = readStorageValue("local", WEEKLY_GOALS_KEY);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    if (isWeeklyGoal(parsed)) {
      return parsed;
    }

    removeStorageValue("local", WEEKLY_GOALS_KEY);
    return null;
  } catch {
    removeStorageValue("local", WEEKLY_GOALS_KEY);
    return null;
  }
}

function isWeeklyGoal(value: unknown): value is WeeklyGoal {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.target === "number" &&
    Number.isFinite(candidate.target) &&
    candidate.target > 0 &&
    typeof candidate.weekStart === "string" &&
    Number.isFinite(Date.parse(candidate.weekStart))
  );
}

export function saveWeeklyGoal(target: number): void {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  const goal: WeeklyGoal = {
    target,
    weekStart: weekStart.toISOString(),
  };
  writeStorageValue("local", WEEKLY_GOALS_KEY, JSON.stringify(goal));
}

export function getCurrentWeekApplications(weeklyData: WeeklyData[]): number {
  if (weeklyData.length === 0) return 0;
  return weeklyData[weeklyData.length - 1]?.count || 0;
}

export function getSourceDisplayName(source: string): string {
  return getJobSourceGuidance(source).label;
}
