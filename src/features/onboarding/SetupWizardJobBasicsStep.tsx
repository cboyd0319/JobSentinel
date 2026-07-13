import type { ComponentProps } from "react";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { CAREER_PROFILES } from "../../utils/profiles";
import { AvoidIcon, SearchIcon, SparkleIcon } from "./SetupWizardIcons";
import { SetupWizardPayFloorSection } from "./SetupWizardPayFloorSection";
import { SetupWizardResumeSuggestions } from "./SetupWizardResumeSuggestions";
import {
  COMMON_STARTER_JOB_TITLES,
  COMMON_WORK_TO_AVOID,
  type SetupConfig,
  type SetupPayUnit,
} from "./setupWizardPreferences";

type ResumeSuggestionsProps = ComponentProps<typeof SetupWizardResumeSuggestions>;

interface SetupWizardJobBasicsStepProps {
  addedResumeSuggestionCount: number;
  avoidInput: string;
  canProceed: boolean;
  config: SetupConfig;
  payFloorInput: string;
  payFloorUnit: SetupPayUnit;
  resumeSkillSuggestions: ResumeSuggestionsProps["suggestions"];
  resumeSuggestionName: ResumeSuggestionsProps["resumeName"];
  resumeSuggestionState: ResumeSuggestionsProps["state"];
  selectedProfile: string | null;
  skillInput: string;
  titleInput: string;
  onAddAllVisibleSkillSuggestions: ResumeSuggestionsProps["onAddAll"];
  onAddAvoid: () => void;
  onAddAvoidSuggestion: (item: string) => void;
  onAddSkill: () => void;
  onAddSkillSuggestion: ResumeSuggestionsProps["onAdd"];
  onAddStarterTitle: (title: string) => void;
  onAddTitle: () => void;
  onBack: () => void;
  onContinue: () => void;
  onPayFloorChange: (value: string) => void;
  onPayNotSure: () => void;
  onPayUnitChange: (unit: SetupPayUnit) => void;
  onRemoveAvoid: (item: string) => void;
  onRemoveSkill: (skill: string) => void;
  onRemoveTitle: (title: string) => void;
  onRequestResumeSuggestions: ResumeSuggestionsProps["onRequest"];
  onSkipResumeSuggestions: ResumeSuggestionsProps["onSkip"];
  onAvoidInputChange: (value: string) => void;
  onSkillInputChange: (value: string) => void;
  onTitleInputChange: (value: string) => void;
}

export function SetupWizardJobBasicsStep({
  addedResumeSuggestionCount,
  avoidInput,
  canProceed,
  config,
  payFloorInput,
  payFloorUnit,
  resumeSkillSuggestions,
  resumeSuggestionName,
  resumeSuggestionState,
  selectedProfile,
  skillInput,
  titleInput,
  onAddAllVisibleSkillSuggestions,
  onAddAvoid,
  onAddAvoidSuggestion,
  onAddSkill,
  onAddSkillSuggestion,
  onAddStarterTitle,
  onAddTitle,
  onBack,
  onContinue,
  onPayFloorChange,
  onPayNotSure,
  onPayUnitChange,
  onRemoveAvoid,
  onRemoveSkill,
  onRemoveTitle,
  onRequestResumeSuggestions,
  onSkipResumeSuggestions,
  onAvoidInputChange,
  onSkillInputChange,
  onTitleInputChange,
}: SetupWizardJobBasicsStepProps) {
  return (
    <div className="motion-safe:animate-slide-up space-y-6">
      {selectedProfile && (
        <div className="p-3 bg-sentinel-50 border border-sentinel-200 rounded-lg text-sm text-sentinel-700">
          Started with <strong>{CAREER_PROFILES.find((profile) => profile.id === selectedProfile)?.name}</strong>. Change anything you want.
        </div>
      )}

      <div>
        <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
          <SearchIcon /> Job Titles
        </h3>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Add a job title..."
            value={titleInput}
            onChange={(event) => onTitleInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddTitle();
              }
            }}
          />
          <Button onClick={onAddTitle} disabled={!titleInput.trim()}>
            Add
          </Button>
        </div>

        {config.title_allowlist.length > 0 ? (
          <div className="flex flex-wrap gap-2 p-3 bg-surface-50 rounded-lg max-h-32 overflow-y-auto">
            {config.title_allowlist.map((title) => (
              <Badge
                key={title}
                variant="sentinel"
                removable
                onRemove={() => onRemoveTitle(title)}
              >
                {title}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="space-y-3 p-6 bg-surface-50 rounded-lg">
            <p className="text-surface-400 text-sm">Add at least one job title</p>
            <div
              className="flex flex-wrap gap-2"
              aria-label="Common starter job titles"
            >
              {COMMON_STARTER_JOB_TITLES.map((title) => (
                <Button
                  key={title}
                  variant="secondary"
                  size="sm"
                  onClick={() => onAddStarterTitle(title)}
                  aria-label={`Add ${title} job title`}
                >
                  {title}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
          <SparkleIcon /> Skills and Work You Want
        </h3>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Add a skill..."
            value={skillInput}
            onChange={(event) => onSkillInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddSkill();
              }
            }}
          />
          <Button onClick={onAddSkill} disabled={!skillInput.trim()}>
            Add
          </Button>
        </div>

        {config.keywords_boost.length > 0 ? (
          <div className="flex flex-wrap gap-2 p-3 bg-surface-50 rounded-lg max-h-32 overflow-y-auto">
            {config.keywords_boost.map((skill) => (
              <Badge
                key={skill}
                variant="alert"
                removable
                onRemove={() => onRemoveSkill(skill)}
              >
                {skill}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center p-6 bg-surface-50 rounded-lg">
            <p className="text-surface-400 text-sm">Skills help us find better matches (optional)</p>
          </div>
        )}
      </div>

      <SetupWizardResumeSuggestions
        state={resumeSuggestionState}
        resumeName={resumeSuggestionName}
        suggestions={resumeSkillSuggestions}
        addedSkills={config.keywords_boost}
        addedCount={addedResumeSuggestionCount}
        onRequest={onRequestResumeSuggestions}
        onAdd={onAddSkillSuggestion}
        onAddAll={onAddAllVisibleSkillSuggestions}
        onSkip={onSkipResumeSuggestions}
      />

      <div>
        <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
          <AvoidIcon /> Work to Avoid
        </h3>
        <p className="mb-3 text-sm text-surface-500">
          Optional. Add words or phrases JobSentinel should rank lower.
        </p>
        <div className="flex gap-2 mb-3">
          <Input
            label="Work to avoid"
            hideLabel
            placeholder="e.g., night shift, heavy travel"
            value={avoidInput}
            onChange={(event) => onAvoidInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddAvoid();
              }
            }}
          />
          <Button onClick={onAddAvoid} disabled={!avoidInput.trim()}>
            Add
          </Button>
        </div>

        <div className="mb-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-surface-500">
            Common to rank lower
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMON_WORK_TO_AVOID.map((item) => {
              const alreadyAdded = config.keywords_exclude.includes(item);
              return (
                <Button
                  key={item}
                  type="button"
                  variant={alreadyAdded ? "ghost" : "secondary"}
                  size="sm"
                  onClick={() => onAddAvoidSuggestion(item)}
                  disabled={alreadyAdded}
                  aria-label={
                    alreadyAdded
                      ? `${item} already ranked lower`
                      : `Add ${item} to rank lower`
                  }
                >
                  {alreadyAdded ? `Added ${item}` : item}
                </Button>
              );
            })}
          </div>
        </div>

        {config.keywords_exclude.length > 0 ? (
          <div className="flex flex-wrap gap-2 p-3 bg-surface-50 rounded-lg max-h-32 overflow-y-auto">
            {config.keywords_exclude.map((item) => (
              <Badge
                key={item}
                variant="danger"
                removable
                onRemove={() => onRemoveAvoid(item)}
              >
                {item}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center p-6 bg-surface-50 rounded-lg">
            <p className="text-surface-400 text-sm">Skip this if nothing comes to mind</p>
          </div>
        )}
      </div>

      <SetupWizardPayFloorSection
        payFloorInput={payFloorInput}
        payFloorUnit={payFloorUnit}
        salaryFloorUsd={config.salary_floor_usd}
        onPayFloorChange={onPayFloorChange}
        onPayNotSure={onPayNotSure}
        onPayUnitChange={onPayUnitChange}
      />

      {!canProceed && (
        <p className="text-center text-sm text-amber-600">
          Add at least one job title to continue
        </p>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1" size="lg">
          Back
        </Button>
        <Button
          onClick={onContinue}
          disabled={!canProceed}
          className="flex-1"
          size="lg"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
