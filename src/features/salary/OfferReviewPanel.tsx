import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import {
  OFFER_EVIDENCE_OPTIONS,
  type OfferReviewInput,
} from "./model";
import { OfferReviewTextarea } from "./SalaryPrimitives";

interface OfferReviewPanelProps {
  review: OfferReviewInput;
  negotiationInputMessage: string | null;
  counterStarter: string;
  declineStarter: string;
  canGenerate: boolean;
  generating: boolean;
  onChange: <K extends keyof OfferReviewInput>(field: K, value: OfferReviewInput[K]) => void;
  onGenerate: () => void;
}

export function OfferReviewPanel({
  review,
  negotiationInputMessage,
  counterStarter,
  declineStarter,
  canGenerate,
  generating,
  onChange,
  onGenerate,
}: OfferReviewPanelProps) {
  return (
    <>
      <div className="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
        <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
          Negotiation note facts
        </p>
        <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
          Separate written offer facts from verbal numbers. JobSentinel drafts notes only from
          the written amount you enter. It will not turn benchmark points into an offer.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="offer-status"
              className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
            >
              Offer status
            </label>
            <select
              id="offer-status"
              value={review.evidenceStatus}
              onChange={(event) =>
                onChange("evidenceStatus", event.target.value as OfferReviewInput["evidenceStatus"])
              }
              className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-surface-900 focus:border-sentinel-500 focus-visible:ring-2 focus-visible:ring-sentinel-500 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100"
            >
              {OFFER_EVIDENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Company (optional)"
            value={review.company}
            onChange={(event) => onChange("company", event.target.value)}
            placeholder="e.g., CareBridge Health"
          />
          <Input
            label="Verbal or recruiter number (optional)"
            type="number"
            min="0"
            inputMode="numeric"
            value={review.verbalOffer}
            onChange={(event) => onChange("verbalOffer", event.target.value)}
            placeholder="e.g., 180000"
            hint="Useful context, but do not treat it as final until it is written."
          />
          <Input
            label="Written offer"
            type="number"
            min="0"
            inputMode="numeric"
            value={review.currentOffer}
            onChange={(event) => onChange("currentOffer", event.target.value)}
            placeholder="e.g., 95000"
            hint="Use the amount from the written offer. If you only have a verbal number, record it separately."
          />
          <Input
            label="Target minimum"
            type="number"
            min="0"
            inputMode="numeric"
            value={review.targetMin}
            onChange={(event) => onChange("targetMin", event.target.value)}
            placeholder="e.g., 105000"
          />
          <Input
            label="Target maximum"
            type="number"
            min="0"
            inputMode="numeric"
            value={review.targetMax}
            onChange={(event) => onChange("targetMax", event.target.value)}
            placeholder="e.g., 115000"
          />
        </div>
        <p
          className="mt-3 text-sm text-surface-600 dark:text-surface-400"
          data-testid="negotiation-fact-guidance"
        >
          {negotiationInputMessage ??
            "Review these facts before using drafted notes. JobSentinel never submits them for you."}
        </p>
        <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
          Verbal numbers are useful context, but ask for written base pay, bonus, equity,
          benefits, location, start date, and deadline before countering or deciding.
        </p>
      </div>

      <div className="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
        <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
          Offer decision review
        </p>
        <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
          Use this to slow down the decision and catch costs that do not show up in base pay.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="Decision deadline (optional)"
            type="date"
            value={review.decisionDeadline}
            onChange={(event) => onChange("decisionDeadline", event.target.value)}
          />
          <OfferReviewTextarea
            label="Total compensation notes (optional)"
            value={review.totalCompNotes}
            onChange={(value) => onChange("totalCompNotes", value)}
            placeholder="Base, bonus, equity, benefits, PTO, retirement, health costs"
          />
          <OfferReviewTextarea
            label="Commute and relocation costs (optional)"
            value={review.commuteRelocationNotes}
            onChange={(value) => onChange("commuteRelocationNotes", value)}
            placeholder="Parking, transit, childcare, relocation, travel days, move costs"
          />
          <OfferReviewTextarea
            label="Deadline pressure notes (optional)"
            value={review.deadlinePressureNotes}
            onChange={(value) => onChange("deadlinePressureNotes", value)}
            placeholder="Same-day deadline, limited time, pressure to accept now"
          />
        </div>
        <ul className="mt-4 space-y-1 text-sm text-surface-600 dark:text-surface-400">
          <li>Compare base, bonus, equity, benefits, PTO, retirement, and health costs.</li>
          <li>Add parking, transit, childcare, relocation, travel days, and move costs.</li>
          <li>Watch for a same-day or exploding deadline; ask for more time when needed.</li>
        </ul>
      </div>

      <div className="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
        <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
          Counter and decline starters
        </p>
        <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
          These are local drafts. JobSentinel does not send them or decide for you.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              Counter starter
            </p>
            <pre className="mt-2 whitespace-pre-wrap rounded-md bg-surface-50 p-3 text-sm text-surface-700 dark:bg-surface-900/40 dark:text-surface-300">
              {counterStarter}
            </pre>
          </div>
          <div>
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              Decline starter
            </p>
            <pre className="mt-2 whitespace-pre-wrap rounded-md bg-surface-50 p-3 text-sm text-surface-700 dark:bg-surface-900/40 dark:text-surface-300">
              {declineStarter}
            </pre>
          </div>
        </div>
      </div>

      <Button
        onClick={onGenerate}
        loading={generating}
        variant="secondary"
        className="w-full"
        disabled={!canGenerate}
      >
        Draft Negotiation Notes
      </Button>
    </>
  );
}
