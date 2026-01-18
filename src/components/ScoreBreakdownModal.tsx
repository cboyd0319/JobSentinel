import { Modal, ModalFooter } from "./Modal";
import { Button } from "./Button";

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
  skills: { weight: 0.40, label: "Skills Match", icon: "🎯", description: "Job title and keyword matches" },
  salary: { weight: 0.25, label: "Salary", icon: "💰", description: "Salary meets your requirements" },
  location: { weight: 0.20, label: "Location", icon: "📍", description: "Remote/hybrid/onsite preference" },
  company: { weight: 0.10, label: "Company", icon: "🏢", description: "Company preference (if configured)" },
  recency: { weight: 0.05, label: "Recency", icon: "⏰", description: "How fresh the posting is" },
} as const;

/**
 * Parse score reasons JSON and categorize by factor
 */
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

  try {
    const reasons: string[] = JSON.parse(reasonsJson);
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
  } catch {
    // Invalid JSON, return empty
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
    const hasFail = reasonsList.some(r => r.includes("✗") || r.toLowerCase().includes("not in allowlist") || r.toLowerCase().includes("doesn't match"));
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
          if (percentMatch) {
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
  if (percentage >= 0.9) return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
  if (percentage >= 0.5) return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20";
  return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
}

/**
 * Get bar color for progress visualization
 */
function getBarColor(score: number, maxScore: number): string {
  const percentage = score / maxScore;
  if (percentage >= 0.9) return "bg-green-500 dark:bg-green-400";
  if (percentage >= 0.5) return "bg-yellow-500 dark:bg-yellow-400";
  return "bg-red-500 dark:bg-red-400";
}

export function ScoreBreakdownModal({
  isOpen,
  onClose,
  score,
  scoreReasons,
  jobTitle,
}: ScoreBreakdownModalProps) {
  const reasons = parseScoreReasons(scoreReasons);
  const breakdown = estimateBreakdown(score, reasons);
  const percentage = Math.round(score * 100);

  const getScoreLabel = () => {
    if (score >= 0.9) return { label: "Great Match!", color: "text-green-600 dark:text-green-400" };
    if (score >= 0.7) return { label: "Good Match", color: "text-sentinel-600 dark:text-sentinel-400" };
    if (score >= 0.5) return { label: "Partial Match", color: "text-yellow-600 dark:text-yellow-400" };
    return { label: "Low Match", color: "text-surface-500 dark:text-surface-400" };
  };

  const scoreLabel = getScoreLabel();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Score Breakdown">
      <div className="space-y-6">
        {/* Overall Score */}
        <div className="text-center pb-4 border-b border-surface-200 dark:border-surface-700">
          <div className="text-5xl font-bold font-mono mb-2" style={{ color: scoreLabel.color.split(" ")[0].replace("text-", "") }}>
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
                    <span className="text-xl">{factor.icon}</span>
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
                      const hasCheck = reason.includes("✓");
                      const hasCross = reason.includes("✗");
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
                          {reason}
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
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
