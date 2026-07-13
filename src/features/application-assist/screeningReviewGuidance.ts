import { HARD_SCREENING_ANSWER_PATTERNS } from "../../shared/applicationScreeningTaxonomy";

const HARD_SCREENING_ANSWER_GUIDANCE =
  "Review this answer against the exact question before using it. Use only what is true and backed by your resume or records.";

export function getHardScreeningAnswerGuidance(pattern: string) {
  const trimmedPattern = pattern.trim();
  if (!trimmedPattern) return null;

  if (
    !HARD_SCREENING_ANSWER_PATTERNS.some((candidate) =>
      candidate.test(trimmedPattern),
    )
  ) {
    return null;
  }

  return HARD_SCREENING_ANSWER_GUIDANCE;
}
