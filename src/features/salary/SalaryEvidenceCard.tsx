import { Badge } from "../../ui/Badge";
import { Card } from "../../ui/Card";
import { HelpIcon } from "../../ui/HelpIcon";
import type { PayFloorBenchmarkGuidance } from "../../shared/payFloorBenchmarkGuidance";
import { formatCurrency } from "../../shared/currencyFormatting";
import { OfferReviewPanel } from "./OfferReviewPanel";
import { ChartIcon } from "./SalaryPrimitives";
import {
  getSalaryStageLabel,
  type OfferReviewInput,
  type SalaryBenchmark,
  type SalarySampleQuality,
} from "./model";

interface SalaryEvidenceCardProps {
  benchmark: SalaryBenchmark | null;
  benchmarkChecked: boolean;
  floorGuidance: PayFloorBenchmarkGuidance | null;
  sampleQuality: SalarySampleQuality | null;
  review: OfferReviewInput;
  negotiationInputMessage: string | null;
  counterStarter: string;
  declineStarter: string;
  canGenerate: boolean;
  generating: boolean;
  onReviewChange: <K extends keyof OfferReviewInput>(
    field: K,
    value: OfferReviewInput[K],
  ) => void;
  onGenerate: () => void;
}

export function SalaryEvidenceCard({
  benchmark,
  benchmarkChecked,
  floorGuidance,
  sampleQuality,
  review,
  negotiationInputMessage,
  counterStarter,
  declineStarter,
  canGenerate,
  generating,
  onReviewChange,
  onGenerate,
}: SalaryEvidenceCardProps) {
  return (
    <Card className="dark:bg-surface-800">
      <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
        Pay Range Evidence
      </h2>
      {!benchmark ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChartIcon className="w-8 h-8 text-surface-400" />
          </div>
          {benchmarkChecked ? (
            <div role="status" aria-live="polite">
              <p className="font-medium text-surface-800 dark:text-surface-200">
                No pay range found
              </p>
              <p className="mt-2 text-surface-500 dark:text-surface-400">
                JobSentinel could not find salary data for this title, location, and role stage.
              </p>
              <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
                Try a broader title, a nearby metro area, or a different role stage.
              </p>
            </div>
          ) : (
            <p className="text-surface-500 dark:text-surface-400">
              Enter role details to compare pay ranges and protect your floor
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium text-surface-800 dark:text-surface-200">
                {benchmark.job_title}
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                {benchmark.location} • {getSalaryStageLabel(benchmark.seniority_level)}
              </p>
            </div>
            {sampleQuality && (
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Badge variant="sentinel">{benchmark.sample_size} salary records</Badge>
                  <Badge variant={sampleQuality.variant}>{sampleQuality.label}</Badge>
                </div>
                <p className="max-w-sm text-sm text-surface-600 dark:text-surface-400 sm:text-right">
                  {sampleQuality.detail}
                </p>
              </div>
            )}
          </div>

          <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
            <div className="mb-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-surface-500 dark:text-surface-400 sm:grid-cols-4">
              <span>Lower range</span>
              <span>Middle</span>
              <span>Higher range</span>
              <span className="flex items-center gap-1">
                Highest seen
                <HelpIcon text="Lower range means about one quarter of records are below it. Middle means half are above and half are below. Higher range means about one quarter are above it. Highest seen is the top record in this sample." />
              </span>
            </div>
            <div className="relative h-8 bg-surface-200 dark:bg-surface-600 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 via-sentinel-500 to-green-500"
                style={{ width: "100%" }}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
              <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
                {formatCurrency(benchmark.p25_salary)}
              </span>
              <span className="text-sm font-medium text-sentinel-600 dark:text-sentinel-400">
                {formatCurrency(benchmark.median_salary)}
              </span>
              <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
                {formatCurrency(benchmark.p75_salary)}
              </span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {formatCurrency(benchmark.max_salary)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-sentinel-50 dark:bg-sentinel-900/20 rounded-lg">
              <p className="text-xs text-sentinel-600 dark:text-sentinel-400 mb-1">
                Higher-range reference point
              </p>
              <p className="font-display text-display-md text-sentinel-700 dark:text-sentinel-300">
                {formatCurrency(benchmark.p75_salary)}
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-xs text-green-600 dark:text-green-400 mb-1">
                High sample point
              </p>
              <p className="font-display text-display-md text-green-700 dark:text-green-300">
                {formatCurrency(benchmark.max_salary)}
              </p>
            </div>
          </div>

          {floorGuidance && (
            <div
              className={`p-4 rounded-lg border ${
                floorGuidance.tone === "caution"
                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                  : "bg-sentinel-50 dark:bg-sentinel-900/20 border-sentinel-100 dark:border-sentinel-800"
              }`}
            >
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                Lowest-pay check
              </p>
              <p className="mt-1 text-sm text-surface-700 dark:text-surface-300">
                {floorGuidance.message}
              </p>
              <div className="mt-3 rounded-md bg-white/70 p-3 dark:bg-surface-900/30">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  Past-pay question
                </p>
                <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
                  If asked about current or past pay, redirect to the role range and target pay
                  you would accept. Avoid anchoring yourself to old compensation.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
            <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
              Level and scope check
            </p>
            <ul className="mt-2 space-y-1 text-sm text-surface-600 dark:text-surface-400">
              <li>Title, seniority, and responsibilities match the pay range.</li>
              <li>Schedule, travel, expected hours, and location fit your life.</li>
              <li>Promotion path, review timing, benefits, and support are clear.</li>
            </ul>
          </div>

          <OfferReviewPanel
            review={review}
            negotiationInputMessage={negotiationInputMessage}
            counterStarter={counterStarter}
            declineStarter={declineStarter}
            canGenerate={canGenerate}
            generating={generating}
            onChange={onReviewChange}
            onGenerate={onGenerate}
          />
        </div>
      )}
    </Card>
  );
}
