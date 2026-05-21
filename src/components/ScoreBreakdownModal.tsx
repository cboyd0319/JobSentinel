import { memo } from "react";
import { Modal, ModalFooter } from "./Modal";
import { Button } from "./Button";
import { SCORE_THRESHOLD_HIGH, SCORE_THRESHOLD_GOOD, SCORE_THRESHOLD_PARTIAL } from "../utils/constants";

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

/**
 * Scoring weights (must match backend in scoring/mod.rs)
 */
const FACTOR_WEIGHTS = {
  skills: { weight: 0.40, label: "Skills Match", icon: "target", description: "Job title and keyword matches" },
  salary: { weight: 0.25, label: "Salary", icon: "currency", description: "Salary meets your requirements" },
  location: { weight: 0.20, label: "Location", icon: "location", description: "Remote/hybrid/onsite preference" },
  company: { weight: 0.10, label: "Company", icon: "company", description: "Company preference (if configured)" },
  recency: { weight: 0.05, label: "Recency", icon: "clock", description: "How fresh the posting is" },
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
  if (percentage >= SCORE_THRESHOLD_HIGH) return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
  if (percentage >= SCORE_THRESHOLD_PARTIAL) return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20";
  return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
}

/**
 * Get bar color for progress visualization
 */
function getBarColor(score: number, maxScore: number): string {
  const percentage = score / maxScore;
  if (percentage >= SCORE_THRESHOLD_HIGH) return "bg-green-500 dark:bg-green-400";
  if (percentage >= SCORE_THRESHOLD_PARTIAL) return "bg-yellow-500 dark:bg-yellow-400";
  return "bg-red-500 dark:bg-red-400";
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

  const getScoreLabel = () => {
    if (safeScore >= SCORE_THRESHOLD_HIGH) return { label: "Great Match!", color: "text-green-600 dark:text-green-400" };
    if (safeScore >= SCORE_THRESHOLD_GOOD) return { label: "Good Match", color: "text-sentinel-600 dark:text-sentinel-400" };
    if (safeScore >= SCORE_THRESHOLD_PARTIAL) return { label: "Partial Match", color: "text-yellow-600 dark:text-yellow-400" };
    return { label: "Low Match", color: "text-surface-500 dark:text-surface-400" };
  };

  const scoreLabel = getScoreLabel();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Score Breakdown">
      <div className="space-y-6">
        {/* Overall Score */}
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

        {/* Factor Breakdown */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wide">
            Scoring Factors
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono px-2 py-1 rounded ${getScoreColor(factorScore, maxScore)}`}>
                      {factorPercentage}%
                    </span>
                    <span className="text-xs text-surface-400 dark:text-surface-500">
                      {Math.round(factor.weight * 100)}% weight
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
                              ? "text-green-600 dark:text-green-400"
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
            Scores are calculated based on how well this job matches your configured preferences.
            You can adjust scoring weights in Settings.
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
