import { Button } from "./Button";
import type { BrowserAssistLearningSummary } from "../shared/browserAssistLearning";

interface LearningSuggestionsProps {
  enabled: boolean;
  onClear: () => void;
  summary: BrowserAssistLearningSummary;
}

export function LinkedInWorkbenchLearning({
  enabled,
  onClear,
  summary,
}: LearningSuggestionsProps) {
  if (!enabled) {
    return (
      <p className="rounded-lg border border-surface-200 bg-surface-50 p-3 text-sm text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300">
        Local learning is off. Workbench buttons still save the records you
        choose, but JobSentinel will not keep suggestion signals from local job
        actions.
      </p>
    );
  }

  const hasSuggestions =
    summary.suggestedTitles.length > 0 ||
    summary.suggestedCompanies.length > 0 ||
    summary.avoidTitles.length > 0;

  return (
    <div className="rounded-lg border border-sentinel-200 bg-sentinel-50 p-4 text-sm text-sentinel-900 dark:border-sentinel-800 dark:bg-sentinel-900/20 dark:text-sentinel-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">Reviewable suggestions</p>
          <p className="mt-1 leading-5 text-sentinel-800 dark:text-sentinel-200">
            Based only on local buttons and saved searches you choose. Review
            these before changing searches or resumes.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={summary.totalSignals === 0}
          onClick={onClear}
        >
          Clear learning
        </Button>
      </div>
      {hasSuggestions ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SuggestionList
            label="Titles to consider"
            values={summary.suggestedTitles}
          />
          <SuggestionList
            label="Companies to notice"
            values={summary.suggestedCompanies}
          />
          <SuggestionList
            label="Search ideas"
            values={summary.suggestedSearches}
          />
          <SuggestionList
            label="Not interested"
            values={summary.avoidTitles}
          />
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-sentinel-700 dark:text-sentinel-200">
          No local learning yet. Save, apply to, track, or mark jobs as not
          interested, or save a search, to build suggestions.
        </p>
      )}
    </div>
  );
}

function SuggestionList({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-sentinel-700 dark:text-sentinel-200">
        {label}
      </p>
      {values.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {values.map((value) => (
            <li key={value} className="rounded bg-white/80 px-2 py-1 dark:bg-surface-900/60">
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-sentinel-700 dark:text-sentinel-200">
          Nothing yet
        </p>
      )}
    </div>
  );
}
