import { Tooltip } from "./Tooltip";

interface GhostReason {
  category: string;
  description: string;
  weight: number;
  severity: "low" | "medium" | "high";
}

interface GhostIndicatorProps {
  ghostScore: number | null;
  ghostReasons: string | null;
  size?: "sm" | "md";
}

const severityStyles = {
  low: "text-yellow-600 dark:text-yellow-400",
  medium: "text-orange-600 dark:text-orange-400",
  high: "text-red-600 dark:text-red-400",
};

const severityBgStyles = {
  low: "bg-yellow-100 dark:bg-yellow-900/30",
  medium: "bg-orange-100 dark:bg-orange-900/30",
  high: "bg-red-100 dark:bg-red-900/30",
};

function getSeverity(score: number): "low" | "medium" | "high" {
  if (score >= 0.75) return "high";
  if (score >= 0.6) return "medium";
  return "low";
}

function parseReasons(reasonsJson: string | null): GhostReason[] {
  if (!reasonsJson) return [];
  try {
    return JSON.parse(reasonsJson);
  } catch {
    return [];
  }
}

function GhostIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      {/* Ghost icon */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 2C8.13 2 5 5.13 5 9v10l2.5-2 2.5 2 2-2 2 2 2.5-2 2.5 2V9c0-3.87-3.13-7-7-7zm-2 7a1 1 0 11-2 0 1 1 0 012 0zm5 0a1 1 0 11-2 0 1 1 0 012 0z"
      />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

export function GhostIndicator({
  ghostScore,
  ghostReasons,
  size = "sm",
}: GhostIndicatorProps) {
  // Don't show if score is null or below threshold
  if (ghostScore === null || ghostScore < 0.5) {
    return null;
  }

  const severity = getSeverity(ghostScore);
  const reasons = parseReasons(ghostReasons);
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  const tooltipContent = (
    <div className="max-w-xs">
      <div className="font-semibold mb-1">
        Potential Ghost Job ({Math.round(ghostScore * 100)}% confidence)
      </div>
      {reasons.length > 0 ? (
        <ul className="text-xs space-y-1">
          {reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-1">
              <span
                className={`inline-block w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                  reason.severity === "high"
                    ? "bg-red-400"
                    : reason.severity === "medium"
                    ? "bg-orange-400"
                    : "bg-yellow-400"
                }`}
              />
              <span>{reason.description}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs">Multiple warning signals detected</p>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltipContent} position="top">
      <span
        className={`
          inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium
          ${severityBgStyles[severity]} ${severityStyles[severity]}
          cursor-help transition-colors
        `}
        aria-label={`Potential ghost job: ${Math.round(ghostScore * 100)}% confidence`}
      >
        {severity === "high" ? (
          <WarningIcon className={sizeClass} />
        ) : (
          <GhostIcon className={sizeClass} />
        )}
        <span className="sr-only sm:not-sr-only">
          {severity === "high" ? "Likely Ghost" : "Possible Ghost"}
        </span>
      </span>
    </Tooltip>
  );
}

// Compact version for job list rows
export function GhostIndicatorCompact({
  ghostScore,
  ghostReasons,
}: Omit<GhostIndicatorProps, "size">) {
  if (ghostScore === null || ghostScore < 0.5) {
    return null;
  }

  const severity = getSeverity(ghostScore);
  const reasons = parseReasons(ghostReasons);

  const tooltipContent = (
    <div className="max-w-xs">
      <div className="font-semibold mb-1">
        Ghost Job Warning ({Math.round(ghostScore * 100)}%)
      </div>
      {reasons.length > 0 ? (
        <ul className="text-xs space-y-1">
          {reasons.slice(0, 3).map((reason, i) => (
            <li key={i}>{reason.description}</li>
          ))}
          {reasons.length > 3 && (
            <li className="text-surface-400">
              +{reasons.length - 3} more warnings
            </li>
          )}
        </ul>
      ) : (
        <p className="text-xs">This job may be stale or fake</p>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltipContent} position="left">
      <span
        className={`
          inline-flex items-center justify-center w-5 h-5 rounded-full
          ${severityBgStyles[severity]} ${severityStyles[severity]}
          cursor-help
        `}
        aria-label={`Ghost warning: ${Math.round(ghostScore * 100)}%`}
      >
        <GhostIcon className="w-3 h-3" />
      </span>
    </Tooltip>
  );
}
