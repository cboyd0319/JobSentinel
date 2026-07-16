import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { safeInvoke } from "../../platform/tauri";
import type { ResumeSuggestionState } from "./SetupWizardResumeSuggestions";
import {
  toResumeSkillSuggestions,
  type SetupConfig,
  type SetupResumeSkill,
  type SetupResumeSummary,
} from "./setupWizardPreferences";

interface UseSetupResumeSuggestionsOptions {
  config: SetupConfig;
  setConfig: Dispatch<SetStateAction<SetupConfig>>;
}

export function useSetupResumeSuggestions({
  config,
  setConfig,
}: UseSetupResumeSuggestionsOptions) {
  const [resumeSuggestionName, setResumeSuggestionName] = useState<string | null>(null);
  const [resumeSkillSuggestions, setResumeSkillSuggestions] = useState<string[]>([]);
  const [addedResumeSkillSourceName, setAddedResumeSkillSourceName] =
    useState<string | null>(null);
  const [addedResumeSkillNames, setAddedResumeSkillNames] = useState<string[]>([]);
  const [resumeSuggestionState, setResumeSuggestionState] =
    useState<ResumeSuggestionState>("idle");

  const addedResumeSuggestionCount = resumeSkillSuggestions.filter((skill) =>
    config.keywords_boost.includes(skill),
  ).length;
  const reviewedResumeSkillNames = addedResumeSkillNames.filter((skill) =>
    config.keywords_boost.includes(skill),
  );
  const resumeSkillSummary =
    addedResumeSkillSourceName && reviewedResumeSkillNames.length > 0
      ? {
          resumeName: addedResumeSkillSourceName,
          skills: reviewedResumeSkillNames,
        }
      : null;

  const handleRequestResumeSuggestions = useCallback(async () => {
    setResumeSuggestionState("loading");
    setResumeSuggestionName(null);
    setResumeSkillSuggestions([]);

    try {
      const activeResume = await safeInvoke<SetupResumeSummary | null>(
        "get_active_resume",
        {},
        { logContext: "Load setup resume suggestions", silent: true },
      );

      if (!activeResume) {
        setResumeSuggestionState("empty");
        return;
      }

      const skills = await safeInvoke<SetupResumeSkill[]>(
        "get_user_skills",
        { resumeId: activeResume.id },
        { logContext: "Load setup resume skills", silent: true },
      );

      const suggestions = toResumeSkillSuggestions(skills);
      setResumeSuggestionName(suggestions.length > 0 ? activeResume.name : null);
      setResumeSkillSuggestions(suggestions);
      setResumeSuggestionState(suggestions.length > 0 ? "ready" : "empty");
    } catch {
      setResumeSuggestionName(null);
      setResumeSkillSuggestions([]);
      setResumeSuggestionState("empty");
    }
  }, []);

  const handleAddSkillSuggestion = useCallback((skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed || config.keywords_boost.includes(trimmed)) return;

    setConfig((prev) => ({
      ...prev,
      keywords_boost: [...prev.keywords_boost, trimmed],
    }));
    setAddedResumeSkillNames((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed],
    );
    setAddedResumeSkillSourceName(resumeSuggestionName);
  }, [config.keywords_boost, resumeSuggestionName, setConfig]);

  const handleAddAllVisibleSkillSuggestions = useCallback(() => {
    const skillsToAdd = resumeSkillSuggestions.filter(
      (skill) => !config.keywords_boost.includes(skill),
    );

    if (skillsToAdd.length === 0) return;

    setConfig((prev) => {
      const newSkills = skillsToAdd.filter(
        (skill) => !prev.keywords_boost.includes(skill),
      );
      if (newSkills.length === 0) return prev;

      return {
        ...prev,
        keywords_boost: [...prev.keywords_boost, ...newSkills],
      };
    });
    setAddedResumeSkillNames((prev) => {
      const next = [...prev];
      for (const skill of skillsToAdd) {
        if (!next.includes(skill)) next.push(skill);
      }
      return next;
    });
    setAddedResumeSkillSourceName(resumeSuggestionName);
  }, [config.keywords_boost, resumeSkillSuggestions, resumeSuggestionName, setConfig]);

  const handleSkipResumeSuggestions = useCallback(() => {
    setResumeSuggestionName(null);
    setResumeSkillSuggestions([]);
    setResumeSuggestionState("hidden");
  }, []);

  const removeResumeSkillSource = useCallback((skillToRemove: string) => {
    setAddedResumeSkillNames((prev) =>
      prev.filter((skill) => skill !== skillToRemove),
    );
  }, []);

  return {
    addedResumeSuggestionCount,
    handleAddAllVisibleSkillSuggestions,
    handleAddSkillSuggestion,
    handleRequestResumeSuggestions,
    handleSkipResumeSuggestions,
    removeResumeSkillSource,
    resumeSkillSuggestions,
    resumeSkillSummary,
    resumeSuggestionName,
    resumeSuggestionState,
  };
}
