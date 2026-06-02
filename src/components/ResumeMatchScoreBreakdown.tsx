import { memo } from "react";
import { Tooltip } from "./Tooltip";

interface ResumeMatchScoreBreakdownProps {
  skillsScore: number | null;
  experienceScore: number | null;
  educationScore: number | null;
  overallScore: number;
  showWeights?: boolean;
}

interface ScoreCategory {
  label: string;
  score: number | null;
  color: {
    bg: string;
    fill: string;
  };
}

function formatPercentage(value: number | null): string {
  if (value === null) return "N/A";
  return `${Math.round(value * 100)}%`;
}

function ScoreBar({
  label,
  score,
  color,
  showWeight,
}: {
  label: string;
  score: number | null;
  color: { bg: string; fill: string };
  showWeight: boolean;
}) {
  const percentage = score !== null ? Math.round(score * 100) : 0;
  const isAvailable = score !== null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-surface-700 dark:text-surface-300">
          {label}
          {showWeight && (
            <span className="ml-1.5 text-xs text-surface-500 dark:text-surface-400">
              One part of this fit estimate
            </span>
          )}
        </span>
        <span
          className={`font-semibold ${
            isAvailable
              ? "text-surface-800 dark:text-white"
              : "text-surface-400 dark:text-surface-500"
          }`}
        >
          {formatPercentage(score)}
        </span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${color.bg}`}>
        <div
          className={`h-full transition-all duration-300 ${color.fill} ${
            !isAvailable ? "opacity-30" : ""
          }`}
          style={{ width: `${isAvailable ? percentage : 100}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} result: ${formatPercentage(score)}`}
        />
      </div>
    </div>
  );
}

export const ResumeMatchScoreBreakdown = memo(function ResumeMatchScoreBreakdown({
  skillsScore,
  experienceScore,
  educationScore,
  overallScore,
  showWeights = true,
}: ResumeMatchScoreBreakdownProps) {
  const categories: ScoreCategory[] = [
    {
      label: "Skills Fit",
      score: skillsScore,
      color: {
        bg: "bg-sentinel-100 dark:bg-sentinel-900/30",
        fill: "bg-sentinel-500 dark:bg-sentinel-400",
      },
    },
    {
      label: "Experience Fit",
      score: experienceScore,
      color: {
        bg: "bg-orange-100 dark:bg-orange-900/30",
        fill: "bg-orange-500 dark:bg-orange-400",
      },
    },
    {
      label: "Education Fit",
      score: educationScore,
      color: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        fill: "bg-blue-500 dark:bg-blue-400",
      },
    },
  ];

  const hasAnyScore = skillsScore !== null || experienceScore !== null || educationScore !== null;

  const tooltipContent = (
    <div className="max-w-xs space-y-1 text-xs">
      <p className="font-semibold mb-2">How this fit estimate is reviewed:</p>
      <p>
        <strong>Skills:</strong> Compares required and preferred skills from the job description
      </p>
      <p>
        <strong>Experience:</strong> Checks how your work history aligns with job requirements
      </p>
      <p>
        <strong>Education:</strong> Checks degree and field of study requirements when the posting includes them
      </p>
      {!hasAnyScore && (
        <p className="mt-2 text-surface-400">
          Add a resume to see detailed fit information
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-800 dark:text-white flex items-center gap-2">
          Resume Fit Details
          <Tooltip content={tooltipContent} position="top">
            <button
              type="button"
              className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              aria-label="Learn more about resume fit"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </Tooltip>
        </h3>
        <span className="text-lg font-bold text-sentinel-600 dark:text-sentinel-400">
          {formatPercentage(overallScore)}
        </span>
      </div>

      {!hasAnyScore && (
        <div className="p-3 bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-lg">
          <p className="text-sm text-surface-600 dark:text-surface-400 text-center">
            Add a resume to see detailed fit information
          </p>
        </div>
      )}

      <div className="space-y-3">
        {categories.map((category) => (
          <ScoreBar
            key={category.label}
            label={category.label}
            score={category.score}
            color={category.color}
            showWeight={showWeights}
          />
        ))}
      </div>

      {hasAnyScore && showWeights && (
        <div className="pt-3 border-t border-surface-200 dark:border-surface-700">
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Overall fit reviews these areas together.
          </p>
        </div>
      )}
    </div>
  );
});
