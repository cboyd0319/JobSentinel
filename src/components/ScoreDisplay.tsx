import { Tooltip } from "./Tooltip";

interface ScoreDisplayProps {
  score: number; // 0-1 range
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
  scoreReasons?: string | null; // JSON array of reason strings
  onClick?: () => void; // Optional click handler for opening modal
  jobTitle?: string; // Optional job title for modal
}

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
 * Get a human-friendly label and explanation for a job match score
 */
function getScoreInfo(score: number) {
  if (score >= 0.9) return {
    label: "Great Match!",
    explanation: "This job closely matches your skills, salary, and preferences. Highly recommended!",
  };
  if (score >= 0.7) return {
    label: "Good Match",
    explanation: "This job matches most of your criteria. Worth a closer look.",
  };
  if (score >= 0.5) return {
    label: "Partial Match",
    explanation: "This job matches some of your criteria but may be missing key requirements.",
  };
  return {
    label: "Low Match",
    explanation: "This job doesn't match many of your preferences. You might want to skip it.",
  };
}

/**
 * Score factor weights for display
 */
const FACTOR_WEIGHTS = {
  skills: { weight: 40, label: "Skills", icon: "🎯" },
  salary: { weight: 25, label: "Salary", icon: "💰" },
  location: { weight: 20, label: "Location", icon: "📍" },
  company: { weight: 10, label: "Company", icon: "🏢" },
  recency: { weight: 5, label: "Recency", icon: "⏰" },
} as const;

/**
 * Render the score breakdown tooltip content
 */
function ScoreBreakdownTooltip({
  score,
  scoreReasons,
}: {
  score: number;
  scoreReasons?: string | null;
}) {
  const scoreInfo = getScoreInfo(score);
  const parsed = parseScoreReasons(scoreReasons);
  const hasReasons = Object.values(parsed).some(arr => arr.length > 0);

  if (!hasReasons) {
    return <span>{scoreInfo.explanation}</span>;
  }

  return (
    <div className="max-w-xs">
      <div className="font-semibold mb-2 text-white">{scoreInfo.label}</div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-surface-600">
            <th className="text-left pb-1 pr-2">Factor</th>
            <th className="text-right pb-1 pr-2">Weight</th>
            <th className="text-left pb-1">Status</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(FACTOR_WEIGHTS) as Array<keyof typeof FACTOR_WEIGHTS>).map((key) => {
            const factor = FACTOR_WEIGHTS[key];
            const reasons = parsed[key];
            const hasPass = reasons.some(r => r.includes("✓"));
            const hasFail = reasons.some(r => r.includes("✗"));
            const status = hasFail ? "✗" : hasPass ? "✓" : "—";
            const statusColor = hasFail ? "text-red-400" : hasPass ? "text-green-400" : "text-surface-400";

            return (
              <tr key={key} className="border-b border-surface-700 last:border-0">
                <td className="py-1 pr-2">
                  <span className="mr-1">{factor.icon}</span>
                  {factor.label}
                </td>
                <td className="text-right py-1 pr-2 text-surface-400">{factor.weight}%</td>
                <td className={`py-1 font-semibold ${statusColor}`}>{status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Show first specific reason */}
      {Object.values(parsed).flat().slice(0, 2).map((reason, i) => (
        <div key={i} className="mt-1.5 text-xs text-surface-300 truncate">
          {reason}
        </div>
      ))}
    </div>
  );
}

export function ScoreDisplay({
  score,
  size = "md",
  showLabel = true,
  animate = true,
  scoreReasons,
  onClick,
}: ScoreDisplayProps) {
  const percentage = Math.round(score * 100);
  const scoreInfo = getScoreInfo(score);

  // Color based on score
  const getScoreColor = () => {
    if (score >= 0.9) return { ring: "stroke-alert-500", text: "text-alert-600 dark:text-alert-400", glow: "shadow-alert-glow" };
    if (score >= 0.7) return { ring: "stroke-sentinel-500", text: "text-sentinel-600 dark:text-sentinel-400", glow: "" };
    if (score >= 0.5) return { ring: "stroke-surface-400", text: "text-surface-600 dark:text-surface-400", glow: "" };
    return { ring: "stroke-surface-300", text: "text-surface-500 dark:text-surface-400", glow: "" };
  };

  const colors = getScoreColor();

  const sizeConfig = {
    sm: { container: "w-12 h-12", strokeWidth: 3, fontSize: "text-xs", radius: 18 },
    md: { container: "w-16 h-16", strokeWidth: 4, fontSize: "text-sm", radius: 26 },
    lg: { container: "w-20 h-20", strokeWidth: 5, fontSize: "text-base", radius: 34 },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (score * circumference);

  return (
    <Tooltip
      content={<ScoreBreakdownTooltip score={score} scoreReasons={scoreReasons} />}
      position="top"
    >
      <div
        className={`inline-flex flex-col items-center gap-1 ${onClick ? "cursor-pointer" : "cursor-help"}`}
        onClick={onClick}
      >
        <div className={`relative ${config.container} ${score >= 0.9 ? colors.glow : ""} rounded-full`}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
            {/* Background ring */}
            <circle
              cx="40"
              cy="40"
              r={config.radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={config.strokeWidth}
              className="text-surface-100 dark:text-surface-700"
            />
            {/* Score ring */}
            <circle
              cx="40"
              cy="40"
              r={config.radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={animate ? circumference : strokeDashoffset}
              className={`${colors.ring} transition-all duration-1000 ease-out`}
              style={{
                strokeDashoffset: strokeDashoffset,
                transitionDelay: animate ? "200ms" : "0ms",
              }}
            />
          </svg>
          {/* Center percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-mono font-semibold ${config.fontSize} ${colors.text}`}>
              {percentage}%
            </span>
          </div>
        </div>
        {showLabel && (
          <span className={`text-xs font-medium ${colors.text}`}>
            {scoreInfo.label}
          </span>
        )}
      </div>
    </Tooltip>
  );
}

// Simple horizontal score bar
interface ScoreBarProps {
  score: number;
  className?: string;
}

export function ScoreBar({ score, className = "" }: ScoreBarProps) {
  const percentage = Math.round(score * 100);

  const getColor = () => {
    if (score >= 0.9) return "bg-alert-500";
    if (score >= 0.7) return "bg-sentinel-500";
    if (score >= 0.5) return "bg-surface-400";
    return "bg-surface-300";
  };

  return (
    <div className={`relative h-2 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden ${className}`}>
      <div
        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out ${getColor()}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
