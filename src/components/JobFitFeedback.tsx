import { memo } from "react";
import type {
  JobFeedbackScoreAdjustment,
  JobFeedbackVerdict,
} from "../shared/jobFeedbackScoring";

interface JobFitFeedbackControlsProps {
  verdict: JobFeedbackVerdict | null;
  onChange: (verdict: JobFeedbackVerdict) => void;
}

interface JobFeedbackAdjustmentProps {
  adjustment: JobFeedbackScoreAdjustment;
}

export const JobFitFeedbackControls = memo(function JobFitFeedbackControls({
  verdict,
  onChange,
}: JobFitFeedbackControlsProps) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border border-surface-200 bg-surface-50 p-1 dark:border-surface-700 dark:bg-surface-900/50"
      aria-label="Teach JobSentinel about this fit"
    >
      <button
        type="button"
        onClick={() => onChange("useful")}
        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-400 ${
          verdict === "useful"
            ? "bg-sentinel-600 text-white"
            : "text-surface-600 hover:bg-white dark:text-surface-300 dark:hover:bg-surface-800"
        }`}
        aria-pressed={verdict === "useful"}
        aria-label={verdict === "useful" ? "Clear useful feedback" : "Mark useful"}
        data-testid="btn-feedback-useful"
      >
        Useful
      </button>
      <button
        type="button"
        onClick={() => onChange("not_useful")}
        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-400 ${
          verdict === "not_useful"
            ? "bg-surface-700 text-white dark:bg-surface-200 dark:text-surface-900"
            : "text-surface-600 hover:bg-white dark:text-surface-300 dark:hover:bg-surface-800"
        }`}
        aria-pressed={verdict === "not_useful"}
        aria-label={
          verdict === "not_useful" ? "Clear not for me feedback" : "Mark not for me"
        }
        data-testid="btn-feedback-not-useful"
      >
        Not for me
      </button>
    </div>
  );
});

export const JobFeedbackAdjustment = memo(function JobFeedbackAdjustment({
  adjustment,
}: JobFeedbackAdjustmentProps) {
  return (
    <div
      data-testid="job-feedback-adjustment"
      className="mb-2 flex items-start gap-2 rounded-lg border border-sentinel-200 bg-sentinel-50 px-3 py-2 text-sm text-sentinel-900 dark:border-sentinel-900/60 dark:bg-sentinel-950/30 dark:text-sentinel-100"
    >
      <FeedbackIcon />
      <div>
        <p className="font-semibold">{adjustment.label}</p>
        <p className="text-xs leading-5 opacity-90">{adjustment.description}</p>
      </div>
    </div>
  );
});

const FeedbackIcon = memo(function FeedbackIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 20h9M12 4h9M4 7h4m-2-2v4m-2 8h4m-2-2v4"
      />
    </svg>
  );
});
