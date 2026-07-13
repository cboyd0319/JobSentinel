import { Button } from "../../ui/Button";

export type ResumeSuggestionState = "idle" | "loading" | "ready" | "empty" | "hidden";

interface SetupWizardResumeSuggestionsProps {
  state: ResumeSuggestionState;
  resumeName: string | null;
  suggestions: string[];
  addedSkills: string[];
  addedCount: number;
  onRequest: () => void;
  onAdd: (skill: string) => void;
  onAddAll: () => void;
  onSkip: () => void;
}

export function SetupWizardResumeSuggestions({
  state,
  resumeName,
  suggestions,
  addedSkills,
  addedCount,
  onRequest,
  onAdd,
  onAddAll,
  onSkip,
}: SetupWizardResumeSuggestionsProps) {
  if (state === "hidden") {
    return null;
  }

  const hasSuggestions = state === "ready" && suggestions.length > 0;
  const title = hasSuggestions ? "Use reviewed resume skills" : "Saved resume skills";

  return (
    <section
      className="border-l-2 border-surface-200 pl-3"
      aria-labelledby="setup-resume-skills-title"
    >
      <h3
        id="setup-resume-skills-title"
        className="font-semibold text-surface-800 mb-2"
      >
        {title}
      </h3>

      {state === "idle" && (
        <>
          <p className="mb-3 text-sm text-surface-500">
            Optional. JobSentinel can check reviewed skill names from your saved
            resume on this computer. Nothing changes until you pick skills.
          </p>
          <Button variant="secondary" size="sm" onClick={onRequest}>
            Check saved resume skills
          </Button>
        </>
      )}

      {state === "loading" && (
        <p className="text-sm text-surface-500" role="status">
          Checking saved resume skills...
        </p>
      )}

      {state === "empty" && (
        <>
          <p className="mb-3 text-sm text-surface-500">
            No reviewed resume skills were found. You can still add skills
            yourself above.
          </p>
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Hide suggestions
          </Button>
        </>
      )}

      {hasSuggestions && (
        <>
          <p className="mb-3 text-sm text-surface-500">
            From{" "}
            <span className="font-medium text-surface-700">
              {resumeName}
            </span>
            . Review these skill names before adding them.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onAddAll}
              disabled={suggestions.every((skill) => addedSkills.includes(skill))}
            >
              Add all visible
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
            >
              Hide suggestions
            </Button>
          </div>
          {addedCount > 0 && (
            <p className="mb-2 text-xs text-surface-500">
              Added skills appear above. Remove any you do not want.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {suggestions.map((skill) => {
              const alreadyAdded = addedSkills.includes(skill);
              return (
                <Button
                  key={skill}
                  variant={alreadyAdded ? "ghost" : "secondary"}
                  size="sm"
                  onClick={() => onAdd(skill)}
                  disabled={alreadyAdded}
                  aria-label={
                    alreadyAdded
                      ? `${skill} already in search`
                      : `Add ${skill} to search`
                  }
                >
                  {alreadyAdded ? `Added ${skill}` : skill}
                </Button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-surface-500">
            Suggestions stay local and do not change your search until you pick them.
          </p>
        </>
      )}
    </section>
  );
}
