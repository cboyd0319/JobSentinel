import {
  getResumeContactValidationMessage,
  type ResumeContactValidationInput,
} from "../shared/resumeContactValidation";

interface ResumeBuilderStepValidationInput {
  contact: ResumeContactValidationInput;
  summary: string;
  experiences: unknown[];
  educations: unknown[];
  skills: unknown[];
}

export function getResumeBuilderStepValidationMessage(
  currentStep: number,
  input: ResumeBuilderStepValidationInput
): string {
  const messages: Record<number, () => string> = {
    1: () => getResumeContactValidationMessage(input.contact) ?? "",
    2: () =>
      input.summary.trim().length >= 10
        ? ""
        : "Write a summary of at least 10 characters.",
    3: () =>
      input.experiences.length > 0
        ? ""
        : "Add one work experience before continuing.",
    4: () => "",
    5: () =>
      input.skills.length > 0
        ? ""
        : "Add one skill before continuing.",
  };
  return messages[currentStep]?.() ?? "";
}

export function canProceedResumeBuilderStep(
  currentStep: number,
  input: ResumeBuilderStepValidationInput
): boolean {
  return getResumeBuilderStepValidationMessage(currentStep, input) === "";
}
