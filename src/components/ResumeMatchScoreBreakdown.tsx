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
  weight: number;
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
  weight,
  color,
  showWeight,
}: {
  label: string;
  score: number | null;
  weight: number;
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
              ({weight}% weight)
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
          aria-label={`${label} score: ${formatPercentage(score)}`}
        />
      </div>
    </div>
  );
}

export function ResumeMatchScoreBreakdown({
  skillsScore,
  experienceScore,
  educationScore,
  overallScore,
  showWeights = true,
}: ResumeMatchScoreBreakdownProps) {
  const categories: ScoreCategory[] = [
    {
      label: "Skills Match",
      score: skillsScore,
      weight: 50,
      color: {
        bg: "bg-sentinel-100 dark:bg-sentinel-900/30",
        fill: "bg-sentinel-500 dark:bg-sentinel-400",
      },
    },
    {
      label: "Experience Match",
      score: experienceScore,
      weight: 30,
      color: {
        bg: "bg-orange-100 dark:bg-orange-900/30",
        fill: "bg-orange-500 dark:bg-orange-400",
      },
    },
    {
      label: "Education Match",
      score: educationScore,
      weight: 20,
      color: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        fill: "bg-blue-500 dark:bg-blue-400",
      },
    },
  ];

  const hasAnyScore = skillsScore !== null || experienceScore !== null || educationScore !== null;

  const tooltipContent = (
    <div className="max-w-xs space-y-1 text-xs">
      <p className="font-semibold mb-2">How scoring works:</p>
      <p>
        <strong>Skills (50%):</strong> Matches required and preferred skills from the job description
      </p>
      <p>
        <strong>Experience (30%):</strong> Aligns your work history with job requirements
      </p>
      <p>
        <strong>Education (20%):</strong> Matches degree and field of study requirements
      </p>
      {!hasAnyScore && (
        <p className="mt-2 text-surface-400">
          Upload a resume to see detailed scoring breakdown
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-800 dark:text-white flex items-center gap-2">
          Resume Match Breakdown
          <Tooltip content={tooltipContent} position="top">
            <button
              type="button"
              className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              aria-label="Learn more about scoring"
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
            Upload a resume to see detailed scoring breakdown
          </p>
        </div>
      )}

      <div className="space-y-3">
        {categories.map((category) => (
          <ScoreBar
            key={category.label}
            label={category.label}
            score={category.score}
            weight={category.weight}
            color={category.color}
            showWeight={showWeights}
          />
        ))}
      </div>

      {hasAnyScore && showWeights && (
        <div className="pt-3 border-t border-surface-200 dark:border-surface-700">
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Overall score is calculated using weighted averages based on component importance
          </p>
        </div>
      )}
    </div>
  );
}
