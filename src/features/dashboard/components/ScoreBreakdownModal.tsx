import { memo } from "react";
import { Modal, ModalFooter } from "../../../components/Modal";
import { Button } from "../../../components/Button";
import { SCORE_THRESHOLD_HIGH, SCORE_THRESHOLD_GOOD, SCORE_THRESHOLD_PARTIAL } from "../../../utils/constants";

interface ScoreBreakdown {
  skills: number;
  salary: number;
  location: number;
  company: number;
  recency: number;
}

interface ScoreBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  scoreReasons?: string | null;
  jobTitle?: string;
}

interface ScoreEvidenceStatus {
  label: string;
  detail: string;
  color: string;
}

/**
 * Fit priorities (must match backend scoring defaults).
 */
const FACTOR_WEIGHTS = {
  skills: {
    weight: 0.40,
    priorityLabel: "Primary",
    label: "Skills Fit",
    icon: "target",
    description: "Job title and search-word fit",
    sourceLabel: "Uses saved job titles and work words",
  },
  salary: {
    weight: 0.25,
    priorityLabel: "Important",
    label: "Salary",
    icon: "currency",
    description: "Salary meets your requirements",
    sourceLabel: "Uses listed pay and your salary floor",
  },
  location: {
    weight: 0.20,
    priorityLabel: "Important",
    label: "Location",
    icon: "location",
    description: "Remote/hybrid/onsite preference",
    sourceLabel: "Uses saved work-location choices",
  },
  company: {
    weight: 0.10,
    priorityLabel: "Supporting",
    label: "Company",
    icon: "company",
    description: "Companies you prefer or hide",
    sourceLabel: "Uses company preferences",
  },
  recency: {
    weight: 0.05,
    priorityLabel: "Supporting",
    label: "Recency",
    icon: "clock",
    description: "How fresh the posting is",
    sourceLabel: "Uses posting date and freshness settings",
  },
} as const;

const LEGACY_PASS_PREFIX = "\u2713";
const LEGACY_FAIL_PREFIX = "\u2717";

function getReasonStatus(reason: string): "pass" | "fail" | "neutral" {
  const lower = reason.toLowerCase();

  if (
    reason.includes(LEGACY_FAIL_PREFIX) ||
    lower.includes("not in allowlist") ||
    lower.includes("doesn't match") ||
    lower.includes("in blocklist") ||
    lower.includes("blocklisted")
  ) {
    return "fail";
  }

  if (
    reason.includes(LEGACY_PASS_PREFIX) ||
    lower.includes("matches") ||
    lower.includes("meets") ||
    lower.includes("favorite")
  ) {
    return "pass";
  }

  return "neutral";
}

function displayReasonText(reason: string): string {
  return reason
    .replace(LEGACY_PASS_PREFIX, "")
    .replace(LEGACY_FAIL_PREFIX, "")
    .replace(/^not in allowlist$/i, "Not in your preferred job titles")
    .replace(/not in allowlist/gi, "not in your preferred job titles")
    .replace(
      /\bcompany\s+is\s+in blocklist\b/gi,
      "Company matches something you chose to avoid",
    )
    .replace(/\bin blocklist\b/gi, "matches something you chose to avoid")
    .replace(/\bblocklisted\b/gi, "marked as something to avoid")
    .replace(/\ballowlist\b/gi, "preferred list")
    .replace(/\bblocklist\b/gi, "avoid list")
    .trim();
}

function FactorIcon({
  icon,
  className = "w-5 h-5 text-surface-500 dark:text-surface-400",
}: {
  icon: (typeof FACTOR_WEIGHTS)[keyof typeof FACTOR_WEIGHTS]["icon"];
  className?: string;
}) {
  const commonProps = {
    className,
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    "aria-hidden": true,
  };

  switch (icon) {
    case "target":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "currency":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v12m3-9.5A3.5 3.5 0 0012 7c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2a3.5 3.5 0 01-3-1.5" />
        </svg>
      );
    case "location":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s6-5.4 6-11a6 6 0 10-12 0c0 5.6 6 11 6 11z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10.5h.01" />
        </svg>
      );
    case "company":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 21V7a2 2 0 012-2h8a2 2 0 012 2v14M9 9h1m-1 4h1m4-4h1m-1 4h1M3 21h18" />
        </svg>
      );
    case "clock":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

/**
 * Parse score reasons JSON and categorize by factor
 */
function parseReasonList(reasonsJson?: string | null): string[] {
  if (!reasonsJson) return [];

  try {
    const parsed: unknown = JSON.parse(reasonsJson);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((reason): reason is string => typeof reason === "string");
  } catch {
    return [];
  }
}

function parseScoreReasons(reasonsJson?: string | null): {
  skills: string[];
  salary: string[];
  location: string[];
  company: string[];
  recency: string[];
} {
  const result = {
    skills: [] as string[],
    salary: [] as string[],
    location: [] as string[],
    company: [] as string[],
    recency: [] as string[],
  };

  if (!reasonsJson) return result;

  const reasons = parseReasonList(reasonsJson);
  for (const reason of reasons) {
    const lower = reason.toLowerCase();
    if (lower.includes("title") || lower.includes("keyword") || lower.includes("allowlist") || lower.includes("blocklist")) {
      result.skills.push(reason);
    } else if (lower.includes("salary")) {
      result.salary.push(reason);
    } else if (lower.includes("remote") || lower.includes("location") || lower.includes("hybrid") || lower.includes("onsite")) {
      result.location.push(reason);
    } else if (lower.includes("company")) {
      result.company.push(reason);
    } else if (lower.includes("posted") || lower.includes("days ago") || lower.includes("fresh") || lower.includes("old")) {
      result.recency.push(reason);
    } else {
      // Default to skills if can't categorize
      result.skills.push(reason);
    }
  }

  return result;
}

function getScoreEvidenceStatus(
  reasons: ReturnType<typeof parseScoreReasons>,
): ScoreEvidenceStatus {
  const reasonStatuses = Object.values(reasons).flat().map(getReasonStatus);
  const hasReasons = reasonStatuses.length > 0;
  const hasPass = reasonStatuses.includes("pass");
  const hasFail = reasonStatuses.includes("fail");

  if (!hasReasons) {
    return {
      label: "Not enough information",
      detail: "No saved reason details. Treat this score as a rough local estimate.",
      color: "text-surface-700 dark:text-surface-200 bg-surface-100 dark:bg-surface-700",
    };
  }

  if (hasPass && hasFail) {
    return {
      label: "Mixed evidence",
      detail: "Some factors fit and some need review. Check must-haves before tailoring.",
      color: "text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20",
    };
  }

  if (hasFail) {
    return {
      label: "Check preferences first",
      detail: "Saved reasons show one or more conflicts with your preferences.",
      color: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20",
    };
  }

  if (hasPass) {
    return {
      label: "Clear fit evidence",
      detail: "Saved reasons support this local fit estimate. Check the original posting before tailoring.",
      color: "text-sentinel-700 dark:text-sentinel-300 bg-sentinel-50 dark:bg-sentinel-900/30",
    };
  }

  return {
    label: "Not enough information",
    detail: "Saved reasons do not clearly show what fits or needs review.",
    color: "text-surface-700 dark:text-surface-200 bg-surface-100 dark:bg-surface-700",
  };
}

/**
 * Calculate breakdown from total score and reasons
 * Note: This is approximate since we only have the total and reasons, not the actual breakdown
 */
function estimateBreakdown(_score: number, reasons: ReturnType<typeof parseScoreReasons>): ScoreBreakdown {
  // Start with max possible for each factor
  const breakdown: ScoreBreakdown = {
    skills: FACTOR_WEIGHTS.skills.weight,
    salary: FACTOR_WEIGHTS.salary.weight,
    location: FACTOR_WEIGHTS.location.weight,
    company: FACTOR_WEIGHTS.company.weight,
    recency: FACTOR_WEIGHTS.recency.weight,
  };

  // Reduce factors that have failure markers
  for (const [key, reasonsList] of Object.entries(reasons) as [keyof ScoreBreakdown, string[]][]) {
    const hasFail = reasonsList.some(r => getReasonStatus(r) === "fail");
    if (hasFail) {
      breakdown[key] = 0;
    } else if (reasonsList.length === 0) {
      // No reasons means likely default/full score for that factor
      // Keep the max value
    } else {
      // Has reasons but no failures - check for partial matches
      const hasPartial = reasonsList.some(r => r.includes("%") && !r.includes("100%"));
      if (hasPartial) {
        // Extract percentage if available
        const match = reasonsList.find(r => r.includes("%"));
        if (match) {
          const percentMatch = match.match(/(\d+)%/);
          if (percentMatch?.[1]) {
            const percent = parseInt(percentMatch[1], 10) / 100;
            breakdown[key] = FACTOR_WEIGHTS[key].weight * percent;
          }
        }
      }
    }
  }

  return breakdown;
}

/**
 * Get color class for a factor score
 */
function getScoreColor(score: number, maxScore: number): string {
  const percentage = score / maxScore;
  if (percentage >= SCORE_THRESHOLD_HIGH) return "text-sentinel-700 dark:text-sentinel-300 bg-sentinel-50 dark:bg-sentinel-900/30";
  if (percentage >= SCORE_THRESHOLD_PARTIAL) return "text-alert-700 dark:text-alert-300 bg-alert-50 dark:bg-alert-900/20";
  return "text-danger bg-red-50 dark:bg-red-900/20";
}

/**
 * Get plain evidence label for a factor.
 */
function getFactorEvidenceLabel(score: number, maxScore: number): string {
  const percentage = score / maxScore;
  if (percentage >= SCORE_THRESHOLD_HIGH) return "Clear evidence";
  if (percentage >= SCORE_THRESHOLD_PARTIAL) return "Some evidence";
  return "Needs review";
}

/**
 * Get bar color for progress visualization
 */
function getBarColor(score: number, maxScore: number): string {
  const percentage = score / maxScore;
  if (percentage >= SCORE_THRESHOLD_HIGH) return "bg-sentinel-500 dark:bg-sentinel-400";
  if (percentage >= SCORE_THRESHOLD_PARTIAL) return "bg-alert-500 dark:bg-alert-400";
  return "bg-danger";
}

export const ScoreBreakdownModal = memo(function ScoreBreakdownModal({
  isOpen,
  onClose,
  score,
  scoreReasons,
  jobTitle,
}: ScoreBreakdownModalProps) {
  const safeScore = Number.isFinite(score) ? score : 0;
  const reasons = parseScoreReasons(scoreReasons);
  const breakdown = estimateBreakdown(safeScore, reasons);
  const percentage = Math.round(safeScore * 100);
  const evidenceStatus = getScoreEvidenceStatus(reasons);

  const getScoreLabel = () => {
    if (safeScore >= SCORE_THRESHOLD_HIGH) return { label: "Strong Fit", color: "text-sentinel-600 dark:text-sentinel-300" };
    if (safeScore >= SCORE_THRESHOLD_GOOD) return { label: "Good Fit", color: "text-blue-700 dark:text-info" };
    if (safeScore >= SCORE_THRESHOLD_PARTIAL) return { label: "Possible Fit", color: "text-alert-700 dark:text-alert-300" };
    return { label: "Needs Review", color: "text-surface-500 dark:text-surface-400" };
  };

  const scoreLabel = getScoreLabel();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fit Details">
      <div className="space-y-6">
        {/* Overall fit */}
        <div className="text-center pb-4 border-b border-surface-200 dark:border-surface-700">
          <div className={`text-5xl font-bold font-mono mb-2 ${scoreLabel.color}`}>
            {percentage}%
          </div>
          <div className={`text-lg font-semibold ${scoreLabel.color}`}>
            {scoreLabel.label}
          </div>
          {jobTitle && (
            <div className="text-sm text-surface-500 dark:text-surface-400 mt-2">
              {jobTitle}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 text-sm dark:border-surface-700 dark:bg-surface-800/70">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-medium text-surface-800 dark:text-surface-100">
              Evidence status
            </span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${evidenceStatus.color}`}>
              {evidenceStatus.label}
            </span>
          </div>
          <p className="text-surface-600 dark:text-surface-300">
            {evidenceStatus.detail}
          </p>
        </div>

        {/* Factor Breakdown */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wide">
            Fit Factors
          </h3>

          {(Object.keys(FACTOR_WEIGHTS) as Array<keyof typeof FACTOR_WEIGHTS>).map((key) => {
            const factor = FACTOR_WEIGHTS[key];
            const factorScore = breakdown[key];
            const maxScore = factor.weight;
            const factorPercentage = Math.round((factorScore / maxScore) * 100);
            const factorReasons = reasons[key];

            return (
              <div key={key} className="space-y-2">
                {/* Factor header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FactorIcon icon={factor.icon} />
                    <div>
                      <div className="font-semibold text-surface-900 dark:text-white">
                        {factor.label}
                      </div>
                      <div className="text-xs text-surface-500 dark:text-surface-400">
                        {factor.description}
                      </div>
                      <div className="text-xs text-surface-500 dark:text-surface-400">
                        {factor.sourceLabel}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${getScoreColor(factorScore, maxScore)}`}>
                      {getFactorEvidenceLabel(factorScore, maxScore)}
                    </span>
                    <span className="text-xs text-surface-400 dark:text-surface-500">
                      {factor.priorityLabel} factor
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-2 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${getBarColor(factorScore, maxScore)}`}
                    style={{ width: `${factorPercentage}%` }}
                  />
                </div>

                {/* Reasons */}
                {factorReasons.length > 0 && (
                  <div className="pl-7 space-y-1">
                    {factorReasons.map((reason, idx) => {
                      const status = getReasonStatus(reason);
                      const hasCheck = status === "pass";
                      const hasCross = status === "fail";
                      return (
                        <div
                          key={idx}
                          className={`text-xs ${
                            hasCheck
                              ? "text-sentinel-600 dark:text-sentinel-300"
                              : hasCross
                              ? "text-red-600 dark:text-red-400"
                              : "text-surface-600 dark:text-surface-400"
                          }`}
                        >
                          {displayReasonText(reason)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Help text */}
        <div className="pt-4 border-t border-surface-200 dark:border-surface-700">
          <p className="text-xs text-surface-500 dark:text-surface-400">
            JobSentinel reviews how this job matches your saved
            preferences. You can adjust your preferences in Settings.
          </p>
        </div>
      </div>

      <ModalFooter>
        <Button
          variant="secondary"
          onClick={onClose}
          onKeyDown={(e) => e.key === 'Enter' && onClose()}
        >
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
});
