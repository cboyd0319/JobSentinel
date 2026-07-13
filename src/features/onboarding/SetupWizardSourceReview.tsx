import type { SetupJobSourceKey } from "./setupWizardPreferences";
import type { SetupWizardSourceReviewOption } from "./setupWizardSourceReviewState";

interface SetupWizardSourceReviewProps {
  sources: SetupWizardSourceReviewOption[];
  onToggleSource: (source: SetupJobSourceKey, enabled: boolean) => void;
}

export function SetupWizardSourceReview({
  sources,
  onToggleSource,
}: SetupWizardSourceReviewProps) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <fieldset
      className="mb-6 rounded-lg border-2 border-surface-200 p-4"
      aria-describedby="setup-source-review-help"
    >
      <legend className="font-semibold text-surface-800">
        Optional job sources
      </legend>
      <p id="setup-source-review-help" className="mt-1 text-sm text-surface-500">
        JobSentinel contacts only sources you check after saving.
      </p>
      <div className="mt-4 space-y-3">
        {sources.map((source) => {
          const sourceId = `setup-source-${source.key}`;
          return (
            <label
              key={source.key}
              htmlFor={sourceId}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-surface-200 bg-surface-50 p-3"
            >
              <input
                id={sourceId}
                type="checkbox"
                checked={source.checked}
                onChange={(event) =>
                  onToggleSource(source.key, event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
              />
              <span>
                <span className="block font-medium text-surface-800">
                  {source.label}
                </span>
                <span className="block text-sm text-surface-500">
                  {source.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
