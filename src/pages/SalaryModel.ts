import { getUserFriendlyError } from "../utils/errorMessages";
import { formatCurrency } from "../utils/formatUtils";

export interface SalaryBenchmark {
  job_title: string;
  location: string;
  seniority_level: string;
  min_salary: number;
  p25_salary: number;
  median_salary: number;
  p75_salary: number;
  max_salary: number;
  average_salary: number;
  sample_size: number;
  last_updated: string;
}

export type SalarySeniority = "entry" | "mid" | "senior" | "staff" | "principal";
export type OfferEvidenceStatus = "written" | "verbal" | "unknown";

export type SalarySampleQuality = {
  label: string;
  detail: string;
  variant: "sentinel" | "alert" | "success";
};

export const SENIORITY_LEVELS: readonly { value: SalarySeniority; label: string }[] = [
  { value: "entry", label: "Starting out (0-2 years)" },
  { value: "mid", label: "Growing experience (3-5 years)" },
  { value: "senior", label: "Experienced (6-10 years)" },
  { value: "staff", label: "Lead or specialist (11-15 years)" },
  { value: "principal", label: "Executive or top-level specialist (16+ years)" },
];

export const OFFER_EVIDENCE_OPTIONS: readonly { value: OfferEvidenceStatus; label: string }[] = [
  { value: "written", label: "Written offer received" },
  { value: "verbal", label: "Verbal or recruiter number only" },
  { value: "unknown", label: "No firm offer yet" },
];

export function getSalarySeniorityForYears(years: number): SalarySeniority {
  if (years <= 2) return "entry";
  if (years <= 5) return "mid";
  if (years <= 10) return "senior";
  if (years <= 15) return "staff";
  return "principal";
}

export function getRepresentativeYearsForSeniority(seniority: SalarySeniority): number {
  switch (seniority) {
    case "entry":
      return 2;
    case "mid":
      return 5;
    case "senior":
      return 10;
    case "staff":
      return 15;
    case "principal":
      return 20;
  }
}

export function getSalaryStageLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "entry") return "Starting out";
  if (normalized === "mid") return "Growing experience";
  if (normalized === "senior") return "Experienced";
  if (normalized === "staff") return "Lead or specialist";
  if (normalized === "principal" || normalized === "executive") {
    return "Executive or top-level specialist";
  }
  return value;
}

export function getSalaryErrorAction(error: unknown): string {
  const friendly = getUserFriendlyError(error);
  return friendly.action ?? friendly.message;
}

export function getSalarySampleQuality(sampleSize: number): SalarySampleQuality {
  if (sampleSize >= 100) {
    return {
      label: "Stronger sample",
      detail:
        "Enough records for a more useful range, but still compare written ranges and role scope.",
      variant: "success",
    };
  }

  if (sampleSize >= 30) {
    return {
      label: "Useful sample",
      detail: "Use this with written ranges, role scope, and current postings.",
      variant: "sentinel",
    };
  }

  return {
    label: "Thin sample",
    detail:
      "Use this as a weak signal. Confirm with the written range, role scope, and current postings.",
    variant: "alert",
  };
}

export function parseSalaryAmount(value: string): number | null {
  const normalized = value.replace(/[$,\s]/g, "");
  if (!normalized) return null;

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

export function getNegotiationInputMessage(
  offerEvidenceStatus: OfferEvidenceStatus,
  currentOfferAmount: number | null,
  targetMinAmount: number | null,
  targetMaxAmount: number | null,
): string | null {
  if (offerEvidenceStatus !== "written") {
    return "Ask for written terms before drafting negotiation notes.";
  }

  if (
    currentOfferAmount === null ||
    targetMinAmount === null ||
    targetMaxAmount === null
  ) {
    return "Add the written offer and your target range before drafting notes.";
  }

  if (targetMaxAmount < targetMinAmount) {
    return "Target maximum must be at least target minimum.";
  }

  return null;
}

export function getCounterStarter({
  company,
  jobTitle,
  targetMinAmount,
  targetMaxAmount,
}: {
  company: string;
  jobTitle: string;
  targetMinAmount: number | null;
  targetMaxAmount: number | null;
}): string {
  const employer = company.trim() || "the employer";
  const role = jobTitle.trim() || "the role";
  const targetRange = formatTargetRange(targetMinAmount, targetMaxAmount);

  return `Thank you for the offer from ${employer} for ${role}. I am interested in the opportunity. Based on the role scope and the written offer details, I would like to discuss a total package closer to ${targetRange}. Can you confirm the written base pay, bonus, equity, benefits, work location, start date, and decision deadline?`;
}

export function getDeclineStarter({
  company,
  jobTitle,
}: {
  company: string;
  jobTitle: string;
}): string {
  const employer = company.trim() || "the employer";
  const role = jobTitle.trim() || "the role";

  return `Thank you for the offer from ${employer} for ${role}. After reviewing the written terms, timing, total compensation, commute or relocation costs, and fit, I am going to decline. I appreciate the time and consideration.`;
}

function formatTargetRange(
  targetMinAmount: number | null,
  targetMaxAmount: number | null,
): string {
  if (targetMinAmount !== null && targetMaxAmount !== null) {
    return `${formatCurrency(targetMinAmount)} to ${formatCurrency(targetMaxAmount)}`;
  }

  if (targetMinAmount !== null) {
    return `at least ${formatCurrency(targetMinAmount)}`;
  }

  return "my target range";
}

export function hasUnresolvedTemplatePlaceholders(script: string) {
  return /{{[^{}]+}}/.test(script);
}
