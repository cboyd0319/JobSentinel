const HARD_SCREENING_ANSWER_PATTERNS = [
  /\bcitizenship\b|\bUS citizen\b|\bU\.S\. citizen\b/i,
  /\bwork authorization\b|\bauthorized to work\b|\bsponsorship\b|\bvisa\b/i,
  /\bclean driving record\b|\bacceptable driving record\b|\bdriving record\b|\bMVR\b|\bmotor vehicle record\b|\bproof of auto insurance\b|\bproof of insurance\b|\bauto insurance\b|\bcar insurance\b|\bvehicle insurance\b|\binsured vehicle\b/i,
  /\breliable transportation\b|\btransportation\b|\bvehicle\b/i,
  /\brelocat(?:e|ion)\b|\btravel\b/i,
  /\beducation\b|\bdegree\b|\bdiploma\b|\bGED\b|\bbachelor'?s?\b/i,
  /\bsalary\b|\bcompensation\b|\bpay\b|\bstart date\b|\bnotice period\b/i,
  /\bavailability\b|\bschedule\b|\bshift\b|\bweekend\b|\bovertime\b|\bholiday\b/i,
  /\bmanaged a team\b|\bmanagement experience\b|\bsupervisory\b|\bsupervisor\b/i,
  /\bbilingual\b|\bmultilingual\b|\blanguage\b|\bfluenc(?:y|e|t)\b/i,
  /\bbackground check\b|\bbackground screening\b|\bdrug screen\b|\bdrug test\b|\bpre[-\s]?employment screening\b/i,
  /\bphysical requirements?\b|\blift\b|\bstanding\b|\bstand for\b/i,
  /\b18 years of age\b|\bminimum age\b|\bage requirement\b/i,
  /\bdriver'?s license\b|\blicen[cs]e\b|\bcertification\b|\bclearance\b/i,
] as const;

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
