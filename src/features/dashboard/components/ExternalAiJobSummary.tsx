import { useState } from "react";
import { Button } from "../../../ui/Button";
import { ExternalAiReviewDialog } from "./ExternalAiReviewDialog";
import { Modal, ModalFooter } from "../../../ui/Modal";
import { useToast } from "../../../shared/toast/useToast";
import {
  createBackendExternalAiGateway,
  loadExternalAiRuntimeConfig,
  providerLabel,
  type ExternalAiRuntimeConfig,
} from "../../../shared/externalAi/externalAiBackendTransport";
import type { ExternalAiRequest } from "../../../shared/externalAi/externalAiTypes";
import { formatSalaryRange } from "../jobDisplayFormatting";

interface ExternalAiSummaryJob {
  id: number;
  hash?: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string;
  created_at: string;
  description?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  remote?: boolean | null;
}

interface ExternalAiJobSummaryProps {
  job: ExternalAiSummaryJob;
}

interface ReviewContext {
  config: ExternalAiRuntimeConfig;
  providerLabel: string;
}

function appendString(
  payload: Record<string, unknown>,
  key: string,
  value: string | null | undefined,
) {
  const normalized = value?.trim();
  if (normalized) payload[key] = normalized;
}

function buildPublicJobPayload(job: ExternalAiSummaryJob): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: job.title,
    company: job.company,
    sourceUrl: job.url,
    source: job.source,
    jobId: String(job.id),
    firstSeenAt: job.created_at,
  };
  const salaryRange = formatSalaryRange(job.salary_min, job.salary_max);

  appendString(payload, "location", job.location);
  appendString(payload, "description", job.description);
  appendString(payload, "salaryRange", salaryRange);
  if (typeof job.remote === "boolean") {
    payload.jobType = job.remote ? "Remote" : "Location listed";
  }

  return payload;
}

function buildJobSummaryRequest(job: ExternalAiSummaryJob): ExternalAiRequest {
  const payload = buildPublicJobPayload(job);

  return {
    feature: "job-description-summary",
    labels: ["External AI optional", "Public-data only"],
    dataCategories: ["job_posting", "public_metadata"],
    payload,
    redactedPayload: payload,
    previewShown: false,
    userApproved: false,
  };
}

function explainSetupGap(config: ExternalAiRuntimeConfig): string | null {
  if (!config.enabled || config.provider === "none") {
    return "Turn on Outside AI in Settings and choose a provider first.";
  }
  if (!config.require_payload_preview || !config.redaction.enabled) {
    return "Review before sending must stay on in Outside AI settings.";
  }
  return null;
}

export function ExternalAiJobSummary({ job }: ExternalAiJobSummaryProps) {
  const toast = useToast();
  const [reviewRequest, setReviewRequest] = useState<ExternalAiRequest | null>(
    null,
  );
  const [reviewContext, setReviewContext] = useState<ReviewContext | null>(
    null,
  );
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  const openReview = async () => {
    setIsPreparing(true);
    try {
      const config = await loadExternalAiRuntimeConfig();
      const setupGap = explainSetupGap(config);
      if (setupGap) {
        toast.info("Outside AI is not ready", setupGap);
        return;
      }

      setReviewContext({
        config,
        providerLabel: providerLabel(config.provider),
      });
      setReviewRequest(buildJobSummaryRequest(job));
    } catch {
      toast.error(
        "Could not check Outside AI settings",
        "Open Settings and try again.",
      );
    } finally {
      setIsPreparing(false);
    }
  };

  const approveReviewedRequest = async (request: ExternalAiRequest) => {
    if (!reviewContext) return;

    const gateway = createBackendExternalAiGateway(reviewContext.config);
    const response = await gateway.send(request);
    setSummary(response.text);
    setReviewRequest(null);
    setIsSummaryOpen(true);
    toast.success("Summary ready", "Reviewed public job details were sent.");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void openReview()}
        className="p-2 text-surface-400 transition-colors opacity-40 hover:text-sentinel-600 group-hover:opacity-100 focus-visible:opacity-100 dark:hover:text-sentinel-300"
        aria-label="Summarize posting with Outside AI"
        title="Summarize posting with Outside AI"
        data-testid="btn-external-ai-summary"
        aria-busy={isPreparing || undefined}
      >
        <SparkleIcon className={isPreparing ? "motion-safe:animate-pulse" : ""} />
      </button>

      <ExternalAiReviewDialog
        isOpen={Boolean(reviewRequest)}
        providerLabel={reviewContext?.providerLabel ?? "Outside AI"}
        request={reviewRequest}
        allowSensitivePayloads={false}
        onCancel={() => setReviewRequest(null)}
        onApprove={approveReviewedRequest}
      />

      <Modal
        isOpen={isSummaryOpen && Boolean(summary)}
        onClose={() => setIsSummaryOpen(false)}
        title="Posting Summary"
        description="Outside AI summarized only the reviewed public posting details."
        size="lg"
      >
        {summary && (
          <div className="space-y-4">
            <pre className="whitespace-pre-wrap rounded-lg border border-surface-200 bg-surface-50 p-4 text-sm text-surface-800 [overflow-wrap:anywhere] dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100">
              {summary}
            </pre>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Treat this as a drafting aid. The job posting remains the source
              to verify before applying.
            </p>
            <ModalFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsSummaryOpen(false)}
              >
                Close
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </>
  );
}

function SparkleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"
      />
    </svg>
  );
}
