import { memo } from "react";
import { Modal, ModalFooter } from "../../../ui/Modal";
import { Button } from "../../../ui/Button";
import {
  GOOD_JOB_MATCH_THRESHOLD,
  PARTIAL_JOB_MATCH_THRESHOLD,
  STRONG_JOB_MATCH_THRESHOLD,
} from "../../../shared/jobMatchScore";
import {
  displayReasonText,
  getReasonStatus,
  parseScoreReasons,
} from "../../../ui/score-display/internal/scoreReasons";
import { ScoreFactorIcon } from "../../../ui/score-display/internal/ScoreFactorIcon";

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
  if (percentage >= STRONG_JOB_MATCH_THRESHOLD) return "text-sentinel-700 dark:text-sentinel-300 bg-sentinel-50 dark:bg-sentinel-900/30";
  if (percentage >= PARTIAL_JOB_MATCH_THRESHOLD) return "text-alert-700 dark:text-alert-300 bg-alert-50 dark:bg-alert-900/20";
  return "text-danger bg-red-50 dark:bg-red-900/20";
}

/**
 * Get plain evidence label for a factor.
 */
function getFactorEvidenceLabel(score: number, maxScore: number): string {
  const percentage = score / maxScore;
  if (percentage >= STRONG_JOB_MATCH_THRESHOLD) return "Clear evidence";
  if (percentage >= PARTIAL_JOB_MATCH_THRESHOLD) return "Some evidence";
  return "Needs review";
}

/**
 * Get bar color for progress visualization
 */
function getBarColor(score: number, maxScore: number): string {
  const percentage = score / maxScore;
  if (percentage >= STRONG_JOB_MATCH_THRESHOLD) return "bg-sentinel-500 dark:bg-sentinel-400";
  if (percentage >= PARTIAL_JOB_MATCH_THRESHOLD) return "bg-alert-500 dark:bg-alert-400";
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
    if (safeScore >= STRONG_JOB_MATCH_THRESHOLD) return { label: "Strong Fit", color: "text-sentinel-600 dark:text-sentinel-300" };
    if (safeScore >= GOOD_JOB_MATCH_THRESHOLD) return { label: "Good Fit", color: "text-blue-700 dark:text-info" };
    if (safeScore >= PARTIAL_JOB_MATCH_THRESHOLD) return { label: "Possible Fit", color: "text-alert-700 dark:text-alert-300" };
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
                    <ScoreFactorIcon
                      icon={factor.icon}
                      className="w-5 h-5 text-surface-500 dark:text-surface-400"
                    />
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
