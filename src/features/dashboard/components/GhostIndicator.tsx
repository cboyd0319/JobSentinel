import { memo, useState } from "react";
import { Tooltip } from "../../../ui/Tooltip";
import { safeInvoke } from "../../../platform/tauri";

interface GhostReason {
  category: "stale" | "repost" | "generic" | "missing_details" | "unrealistic" | "company_behavior";
  description: string;
  weight: number;
  severity: "low" | "medium" | "high";
}

const ghostReasonCategories = new Set<string>([
  "stale",
  "repost",
  "generic",
  "missing_details",
  "unrealistic",
  "company_behavior",
]);

const ghostReasonSeverities = new Set<string>(["low", "medium", "high"]);

const categoryLabels: Record<GhostReason["category"], string> = {
  stale: "Older posting",
  repost: "Repeated posting",
  generic: "Low-detail posting",
  missing_details: "Missing details",
  unrealistic: "Unusual details",
  company_behavior: "Employer posting pattern",
};

interface GhostIndicatorProps {
  ghostScore: number | null;
  ghostReasons: string | null;
  size?: "sm" | "md";
  jobId?: number;
  onFeedbackSubmitted?: (verdict: "real" | "ghost") => void;
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

function feedbackLabel(feedbackState: "real" | "ghost"): string {
  return feedbackState === "real" ? "verified active" : "needs review";
}

function indicatorAriaLabel(ghostScore: number): string {
  return `Posting may need review, ${getSeverity(ghostScore)} warning`;
}

function getSeverity(score: number): "low" | "medium" | "high" {
  if (score >= 0.75) return "high";
  if (score >= 0.6) return "medium";
  return "low";
}

function parseReasons(reasonsJson: string | null): GhostReason[] {
  if (!reasonsJson) return [];
  try {
    const parsed: unknown = JSON.parse(reasonsJson);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isGhostReason);
  } catch {
    return [];
  }
}

function isGhostReason(value: unknown): value is GhostReason {
  if (!value || typeof value !== "object") {
    return false;
  }

  const reason = value as Record<string, unknown>;

  return (
    typeof reason.category === "string" &&
    ghostReasonCategories.has(reason.category) &&
    typeof reason.description === "string" &&
    typeof reason.weight === "number" &&
    Number.isFinite(reason.weight) &&
    typeof reason.severity === "string" &&
    ghostReasonSeverities.has(reason.severity)
  );
}

function ReviewIcon({ className }: { className?: string }) {
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
        strokeWidth={1.5}
        d="M9 11l2 2 4-4m4 9V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2z"
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

function SeverityDot({ severity }: { severity: GhostReason["severity"] }) {
  const color =
    severity === "high"
      ? "bg-red-400"
      : severity === "medium"
        ? "bg-orange-400"
        : "bg-yellow-400";

  return <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${color}`} aria-hidden="true" />;
}

export const GhostIndicator = memo(function GhostIndicator({
  ghostScore,
  ghostReasons,
  size = "sm",
  jobId,
  onFeedbackSubmitted,
}: GhostIndicatorProps) {
  const [feedbackState, setFeedbackState] = useState<"real" | "ghost" | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Don't show if score is null or below threshold
  if (ghostScore === null || ghostScore < 0.5) {
    return null;
  }

  const severity = getSeverity(ghostScore);
  const reasons = parseReasons(ghostReasons);
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const ariaLabel = indicatorAriaLabel(ghostScore);

  const handleFeedback = async (feedbackVerdict: "real" | "ghost") => {
    if (!jobId || isSubmitting) return;

    setIsSubmitting(true);
    setFeedbackError(false);
    try {
      if (feedbackVerdict === "real") {
        await safeInvoke("mark_job_as_real", { jobId }, {
          logContext: "Mark job as real",
          silent: true
        });
      } else {
        await safeInvoke("mark_job_as_ghost", { jobId }, {
          logContext: "Mark posting as needs review",
          silent: true
        });
      }
      setFeedbackState(feedbackVerdict);
      onFeedbackSubmitted?.(feedbackVerdict);
    } catch {
      setFeedbackError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tooltipContent = (
    <div className="max-w-xs">
      <div className="font-semibold mb-1">
        Posting may need review
      </div>
      {reasons.length > 0 ? (
        <ul className="text-xs space-y-1.5">
          {reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <SeverityDot severity={reason.severity} />
              <span className="flex-1">
                <span className={`font-medium ${
                  reason.severity === "high"
                    ? "text-red-400"
                    : reason.severity === "medium"
                    ? "text-orange-400"
                    : "text-yellow-400"
                }`}>
                  {categoryLabels[reason.category] || reason.category}:
                </span>{" "}
                {reason.description}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs">Some posting details may need checking against the original job page</p>
      )}
      {jobId && !feedbackState && (
        <div className="mt-2 pt-2 border-t border-surface-200 dark:border-surface-600">
          <p className="text-xs text-surface-400 mb-1">Did you verify this posting?</p>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFeedback("real");
              }}
              disabled={isSubmitting}
              className="flex-1 px-2 py-1 text-xs rounded bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-1"
              title="Mark as verified posting"
            >
              Verified
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFeedback("ghost");
              }}
              disabled={isSubmitting}
              className="flex-1 px-2 py-1 text-xs rounded bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
              title="Mark as stale or unverified"
            >
              Needs Review
            </button>
          </div>
          {feedbackError && (
            <p role="alert" className="mt-2 text-xs text-red-300">
              Could not save feedback. Try again.
            </p>
          )}
        </div>
      )}
      {feedbackState && (
        <div className="mt-2 pt-2 border-t border-surface-200 dark:border-surface-600">
          <p className="text-xs text-green-400">
            Marked as {feedbackLabel(feedbackState)}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltipContent} position="top">
      <span
        className={`
          inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium
          ${severityBgStyles[severity]} ${severityStyles[severity]}
          cursor-help transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-1
          ${feedbackState === "real" ? "opacity-50" : ""}
        `}
        aria-label={ariaLabel}
        tabIndex={0}
      >
        {severity === "high" ? (
          <WarningIcon className={sizeClass} />
        ) : (
          <ReviewIcon className={sizeClass} />
        )}
        <span className="sr-only sm:not-sr-only">
          {feedbackState === "real"
            ? "Marked Verified"
            : severity === "high"
            ? "Verify First"
            : "Needs Review"}
        </span>
      </span>
    </Tooltip>
  );
});

// Compact version for job list rows
export const GhostIndicatorCompact = memo(function GhostIndicatorCompact({
  ghostScore,
  ghostReasons,
  jobId,
  onFeedbackSubmitted,
}: Omit<GhostIndicatorProps, "size">) {
  const [feedbackState, setFeedbackState] = useState<"real" | "ghost" | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (ghostScore === null || ghostScore < 0.5) {
    return null;
  }

  const severity = getSeverity(ghostScore);
  const reasons = parseReasons(ghostReasons);
  const ariaLabel = indicatorAriaLabel(ghostScore);

  const handleFeedback = async (feedbackVerdict: "real" | "ghost") => {
    if (!jobId || isSubmitting) return;

    setIsSubmitting(true);
    setFeedbackError(false);
    try {
      if (feedbackVerdict === "real") {
        await safeInvoke("mark_job_as_real", { jobId }, {
          logContext: "Mark job as real",
          silent: true
        });
      } else {
        await safeInvoke("mark_job_as_ghost", { jobId }, {
          logContext: "Mark posting as needs review",
          silent: true
        });
      }
      setFeedbackState(feedbackVerdict);
      onFeedbackSubmitted?.(feedbackVerdict);
    } catch {
      setFeedbackError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tooltipContent = (
    <div className="max-w-xs">
      <div className="font-semibold mb-1">
        Posting may need review
      </div>
      {reasons.length > 0 ? (
        <ul className="text-xs space-y-1">
          {reasons.slice(0, 3).map((reason, i) => (
            <li key={i}>{reason.description}</li>
          ))}
          {reasons.length > 3 && (
            <li className="text-surface-400">
              +{reasons.length - 3} more details to check
            </li>
          )}
        </ul>
      ) : (
        <p className="text-xs">This posting may be stale, reposted, or hard to verify</p>
      )}
      {jobId && !feedbackState && (
        <div className="mt-2 pt-2 border-t border-surface-200 dark:border-surface-600">
          <p className="text-xs text-surface-400 mb-1">Did you verify this posting?</p>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFeedback("real");
              }}
              disabled={isSubmitting}
              className="flex-1 px-2 py-1 text-xs rounded bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-1"
              title="Mark as verified posting"
            >
              Verified
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFeedback("ghost");
              }}
              disabled={isSubmitting}
              className="flex-1 px-2 py-1 text-xs rounded bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
              title="Mark as stale or unverified"
            >
              Needs Review
            </button>
          </div>
          {feedbackError && (
            <p role="alert" className="mt-2 text-xs text-red-300">
              Could not save feedback. Try again.
            </p>
          )}
        </div>
      )}
      {feedbackState && (
        <div className="mt-2 pt-2 border-t border-surface-200 dark:border-surface-600">
          <p className="text-xs text-green-400">
            Marked as {feedbackLabel(feedbackState)}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltipContent} position="left">
      <span
        className={`
          inline-flex items-center justify-center w-5 h-5 rounded-full
          ${severityBgStyles[severity]} ${severityStyles[severity]}
          cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-1
          ${feedbackState === "real" ? "opacity-50" : ""}
        `}
        aria-label={ariaLabel}
        tabIndex={0}
      >
        <ReviewIcon className="w-3 h-3" />
      </span>
    </Tooltip>
  );
});
