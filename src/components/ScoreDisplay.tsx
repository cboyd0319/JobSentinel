import { memo } from "react";
import { Tooltip } from "./Tooltip";
import {
  SCORE_THRESHOLD_HIGH,
  SCORE_THRESHOLD_GOOD,
  SCORE_THRESHOLD_PARTIAL,
} from "../utils/constants";

interface ScoreDisplayProps {
  score: number | null; // 0-1 range, null when unscored
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
    if (
      lower.includes("title") ||
      lower.includes("keyword") ||
      lower.includes("allowlist") ||
      lower.includes("blocklist")
    ) {
      result.skills.push(reason);
    } else if (lower.includes("salary")) {
      result.salary.push(reason);
    } else if (
      lower.includes("remote") ||
      lower.includes("location") ||
      lower.includes("hybrid") ||
      lower.includes("onsite")
    ) {
      result.location.push(reason);
    } else if (lower.includes("company")) {
      result.company.push(reason);
    } else if (
      lower.includes("posted") ||
      lower.includes("days ago") ||
      lower.includes("fresh") ||
      lower.includes("old")
    ) {
      result.recency.push(reason);
    } else {
      // Default to skills if can't categorize
      result.skills.push(reason);
    }
  }

  return result;
}

/**
 * Get a human-friendly label and explanation for job fit.
 */
function getScoreInfo(score: number) {
  if (score >= SCORE_THRESHOLD_HIGH)
    return {
      label: "Strong Fit",
      explanation:
        "Strong evidence this fits your stated skills, pay, and preferences. Worth tailoring after checking the original posting.",
    };
  if (score >= SCORE_THRESHOLD_GOOD)
    return {
      label: "Good Fit",
      explanation:
        "This role fits many criteria. Review pay, posting freshness, and must-haves before tailoring.",
    };
  if (score >= SCORE_THRESHOLD_PARTIAL)
    return {
      label: "Possible Fit",
      explanation:
        "Some criteria line up, but key requirements may be missing. Check must-haves first.",
    };
  return {
    label: "Needs Review",
    explanation:
      "Limited fit evidence. Save time unless it has a reason your settings missed.",
  };
}

/**
 * Fit factor priorities for display.
 */
const FACTOR_WEIGHTS = {
  skills: { priority: "Primary", label: "Skills", icon: "target" },
  salary: { priority: "Important", label: "Salary", icon: "currency" },
  location: { priority: "Important", label: "Location", icon: "location" },
  company: { priority: "Supporting", label: "Company", icon: "company" },
  recency: { priority: "Supporting", label: "Recency", icon: "clock" },
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
  className = "w-3 h-3 inline-block mr-1 align-text-bottom",
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
 * Size configurations for score display (extracted to prevent re-creation on each render)
 */
const SIZE_CONFIG = {
  sm: {
    container: "w-12 h-12",
    strokeWidth: 3,
    fontSize: "text-xs",
    radius: 18,
  },
  md: {
    container: "w-16 h-16",
    strokeWidth: 4,
    fontSize: "text-sm",
    radius: 26,
  },
  lg: {
    container: "w-20 h-20",
    strokeWidth: 5,
    fontSize: "text-base",
    radius: 34,
  },
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
  const hasReasons = Object.values(parsed).some((arr) => arr.length > 0);

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
            <th className="text-right pb-1 pr-2">Priority</th>
            <th className="text-left pb-1">Status</th>
          </tr>
        </thead>
        <tbody>
          {(
            Object.keys(FACTOR_WEIGHTS) as Array<keyof typeof FACTOR_WEIGHTS>
          ).map((key) => {
            const factor = FACTOR_WEIGHTS[key];
            const reasons = parsed[key];
            const statuses = reasons.map(getReasonStatus);
            const hasPass = statuses.includes("pass");
            const hasFail = statuses.includes("fail");
            const status = hasFail
              ? "Needs review"
              : hasPass
                ? "Fits"
                : "No clear signal";
            const statusColor = hasFail
              ? "text-red-400"
              : hasPass
                ? "text-green-400"
                : "text-surface-400";

            return (
              <tr
                key={key}
                className="border-b border-surface-700 last:border-0"
              >
                <td className="py-1 pr-2">
                  <FactorIcon icon={factor.icon} />
                  {factor.label}
                </td>
                <td className="text-right py-1 pr-2 text-surface-400">
                  {factor.priority}
                </td>
                <td className={`py-1 font-semibold ${statusColor}`}>
                  {status}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-surface-300">
        Uses saved titles, work words, pay, location, company, and freshness settings.
      </div>
      {/* Show first specific reason */}
      {Object.values(parsed)
        .flat()
        .slice(0, 2)
        .map((reason, i) => (
          <div key={i} className="mt-1.5 text-xs text-surface-300 truncate">
            {displayReasonText(reason)}
          </div>
        ))}
    </div>
  );
}

export const ScoreDisplay = memo(function ScoreDisplay({
  score,
  size = "md",
  showLabel = true,
  animate = true,
  scoreReasons,
  onClick,
}: ScoreDisplayProps) {
  // Guard against null/NaN/undefined scores
  const safeScore: number = score != null && Number.isFinite(score) ? score : 0;
  const percentage = Math.round(safeScore * 100);
  const scoreInfo = getScoreInfo(safeScore);

  // Color based on score
  const getScoreColor = () => {
    if (safeScore >= SCORE_THRESHOLD_HIGH)
      return {
        ring: "stroke-alert-500",
        text: "text-alert-600 dark:text-alert-400",
        glow: "shadow-alert-glow",
      };
    if (safeScore >= SCORE_THRESHOLD_GOOD)
      return {
        ring: "stroke-sentinel-500",
        text: "text-sentinel-600 dark:text-sentinel-400",
        glow: "",
      };
    if (safeScore >= SCORE_THRESHOLD_PARTIAL)
      return {
        ring: "stroke-surface-400",
        text: "text-surface-600 dark:text-surface-400",
        glow: "",
      };
    return {
      ring: "stroke-surface-300",
      text: "text-surface-500 dark:text-surface-400",
      glow: "",
    };
  };

  const colors = getScoreColor();

  const config = SIZE_CONFIG[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - safeScore * circumference;

  return (
    <Tooltip
      content={
        <ScoreBreakdownTooltip score={safeScore} scoreReasons={scoreReasons} />
      }
      position="top"
    >
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={
          onClick
            ? `Fit estimate: ${percentage}%. ${scoreInfo.label}`
            : undefined
        }
        className={`inline-flex flex-col items-center gap-1 ${onClick ? "cursor-pointer" : "cursor-help"}`}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      >
        <div
          className={`relative ${config.container} ${safeScore >= SCORE_THRESHOLD_HIGH ? colors.glow : ""} rounded-full`}
        >
          <svg
            className="w-full h-full -rotate-90"
            viewBox="0 0 80 80"
            aria-hidden="true"
          >
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
            <span
              className={`font-mono font-semibold ${config.fontSize} ${colors.text}`}
            >
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
});

// Simple horizontal score bar
interface ScoreBarProps {
  score: number | null;
  className?: string;
}

export const ScoreBar = memo(function ScoreBar({
  score,
  className = "",
}: ScoreBarProps) {
  const safeBarScore: number =
    score != null && Number.isFinite(score) ? score : 0;
  const percentage = Math.round(safeBarScore * 100);

  const getColor = () => {
    if (safeBarScore >= SCORE_THRESHOLD_HIGH) return "bg-alert-500";
    if (safeBarScore >= SCORE_THRESHOLD_GOOD) return "bg-sentinel-500";
    if (safeBarScore >= SCORE_THRESHOLD_PARTIAL) return "bg-surface-400";
    return "bg-surface-300";
  };

  return (
    <div
      className={`relative h-2 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden ${className}`}
    >
      <div
        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out ${getColor()}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
});
