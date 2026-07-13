import type { JobFeedbackScoreAdjustment } from "../../../shared/jobFeedbackScoring";
import type { PayTransparencyGuidance } from "../../../shared/payTransparencyRules";
import type { JobSourceGuidance } from "../../../utils/sourceLabels";
import { JobFeedbackAdjustment } from "./JobFitFeedback";
import type {
  PayFloorGuidance,
  PostingRiskGuidance,
  SalaryRangeQualityGuidance,
  ScamRiskGuidance,
} from "./jobCardGuidance";
import { ArrowIcon, RiskIcon, SalaryIcon, SourceIcon } from "./JobCardIcons";

interface JobCardGuidancePanelsProps {
  feedbackScoreAdjustment: JobFeedbackScoreAdjustment | null;
  hasSafeJobUrl: boolean;
  onOpenJob: () => void;
  payFloorGuidance: PayFloorGuidance | null;
  payTransparencyGuidance: PayTransparencyGuidance | null;
  postingRiskGuidance: PostingRiskGuidance | null;
  salaryRangeQualityGuidance: SalaryRangeQualityGuidance | null;
  scamRiskGuidance: ScamRiskGuidance | null;
  sourceReviewGuidance: JobSourceGuidance["review"];
}

export function JobCardGuidancePanels({
  feedbackScoreAdjustment,
  hasSafeJobUrl,
  onOpenJob,
  payFloorGuidance,
  payTransparencyGuidance,
  postingRiskGuidance,
  salaryRangeQualityGuidance,
  scamRiskGuidance,
  sourceReviewGuidance,
}: JobCardGuidancePanelsProps) {
  const handleOpenKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenJob();
    }
  };
  const sourceReviewBorderClass = sourceReviewGuidance?.tone === "warning"
    ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
    : "border-surface-200 bg-surface-50 text-surface-800 dark:border-surface-700 dark:bg-surface-900/40 dark:text-surface-200";

  return (
    <>
      {scamRiskGuidance && (
        <div
          data-testid="scam-risk-guidance"
          className="mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
        >
          <RiskIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-300" />
          <div>
            <p className="font-semibold">{scamRiskGuidance.title}</p>
            <p className="text-xs leading-5 opacity-90">{scamRiskGuidance.description}</p>
          </div>
        </div>
      )}

      {postingRiskGuidance && (
        <div
          data-testid="posting-risk-guidance"
          className={`mb-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
            postingRiskGuidance.level === "high"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
              : postingRiskGuidance.level === "medium"
                ? "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200"
                : "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/30 dark:text-yellow-200"
          }`}
        >
          <RiskIcon
            className={
              postingRiskGuidance.level === "high"
                ? "mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-300"
                : postingRiskGuidance.level === "medium"
                  ? "mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600 dark:text-orange-300"
                  : "mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-300"
            }
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{postingRiskGuidance.title}</p>
            <p className="text-xs leading-5 opacity-90">{postingRiskGuidance.description}</p>
            {postingRiskGuidance.nextSteps && (
              <ul className="mt-1 space-y-0.5 text-xs leading-5 opacity-90">
                {postingRiskGuidance.nextSteps.map((step) => <li key={step}>{step}</li>)}
              </ul>
            )}
            {postingRiskGuidance.actionLabel && (
              <button
                type="button"
                onClick={onOpenJob}
                onKeyDown={handleOpenKeyDown}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-900/50"
                aria-label={postingRiskGuidance.actionAriaLabel}
              >
                {postingRiskGuidance.actionLabel}
                <ArrowIcon />
              </button>
            )}
          </div>
        </div>
      )}

      {sourceReviewGuidance && (
        <div
          data-testid="source-review-guidance"
          className={`mb-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${sourceReviewBorderClass}`}
        >
          <SourceIcon />
          <div>
            <p className="font-semibold">{sourceReviewGuidance.title}</p>
            <p className="text-xs leading-5 opacity-90">{sourceReviewGuidance.description}</p>
          </div>
        </div>
      )}

      {feedbackScoreAdjustment && <JobFeedbackAdjustment adjustment={feedbackScoreAdjustment} />}

      {!hasSafeJobUrl && (
        <div
          data-testid="job-link-guidance"
          className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <SourceIcon />
          <div>
            <p className="font-semibold">Check job link</p>
            <p className="text-xs leading-5 opacity-90">
              This saved job link does not look safe to open. Use the employer
              page or a fresh public job link before tailoring.
            </p>
          </div>
        </div>
      )}

      {payFloorGuidance && (
        <GuidancePanel guidance={payFloorGuidance} testId="pay-floor-guidance" />
      )}
      {payTransparencyGuidance && (
        <GuidancePanel guidance={payTransparencyGuidance} testId="pay-transparency-guidance" />
      )}
      {salaryRangeQualityGuidance && (
        <GuidancePanel guidance={salaryRangeQualityGuidance} testId="salary-range-quality-guidance" />
      )}
    </>
  );
}

function GuidancePanel({
  guidance,
  testId,
}: {
  guidance: { title: string; description: string };
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
    >
      <SalaryIcon />
      <div>
        <p className="font-semibold">{guidance.title}</p>
        <p className="text-xs leading-5 opacity-90">{guidance.description}</p>
      </div>
    </div>
  );
}
