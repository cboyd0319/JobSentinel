import type {
  AtsAnalysisResult,
  HardConstraintRisk,
  MissingKeyword,
} from "../shared/atsAnalysisContracts";
import {
  formatEvidenceSections,
  formatHardConstraintCategory,
  formatIssueSeverity,
  formatSuggestionCategory,
  isCitizenshipRequirement,
} from "../shared/atsAnalysisLabels";

export type {
  AtsAnalysisResult,
  AtsSuggestion,
  FormatIssue,
  HardConstraintRisk,
  KeywordMatch,
  MissingKeyword,
  RequirementReview,
} from "../shared/atsAnalysisContracts";

export {
  formatIssueSeverity,
  formatSuggestionCategory,
};

export function formatHardConstraintRiskCategory(risk: HardConstraintRisk): string {
  if (
    risk.category === "Citizenship" ||
    (risk.category === "WorkAuthorization" && isCitizenshipRequirement(risk.requirement))
  ) {
    return "Citizenship";
  }

  return formatHardConstraintCategory(risk.category);
}

export function formatResumeEvidenceSections(sections: string[]): string {
  return formatEvidenceSections(sections);
}

const STEP_TIPS: Record<number, string[]> = {
  1: [
    "Include a professional email address",
    "Add a LinkedIn profile if you use one",
    "Use a location that matches job requirements",
  ],
  2: [
    "Keep summary to 2-3 sentences",
    "Include your years of experience",
    "Mention your specialization or expertise",
  ],
  3: [
    "Use action verbs to start bullet points",
    "Include quantifiable achievements",
    "Focus on impact, not just duties",
  ],
  4: [
    "Include degree, institution, and graduation date",
    "Add relevant coursework for junior roles",
    "List honors and achievements",
  ],
  5: [
    "Match skills to job requirements",
    "Group skills by category",
    "Include tools, workplace, and role-specific skills",
  ],
};

export function getStepTips(step: number, analysis: AtsAnalysisResult | null): string[] {
  if (!analysis) {
    return STEP_TIPS[step] ?? [];
  }

  const tips: string[] = [];

  if (analysis.format_score < 70) {
    tips.push("Use a simpler format so hiring systems can read it");
  }
  if (analysis.completeness_score < 70) {
    tips.push("Add more details to improve the details-included result");
  }
  if (analysis.missing_keywords.length > 3) {
    tips.push(`Review job-post words for truthful fit: ${analysis.missing_keywords.slice(0, 3).join(", ")}`);
  }
  if (analysis.format_issues.some((issue) => issue.severity === "Critical")) {
    tips.push("Fix the most important readability details first");
  }

  return tips.slice(0, 3);
}

export function getMissingKeywordDetails(analysis: AtsAnalysisResult): MissingKeyword[] {
  if (analysis.missing_keyword_details && analysis.missing_keyword_details.length > 0) {
    return analysis.missing_keyword_details;
  }

  return analysis.missing_keywords.map((keyword) => ({
    keyword,
    importance: "Industry",
  }));
}

export function getMissingKeywordGroups(analysis: AtsAnalysisResult) {
  const missing = getMissingKeywordDetails(analysis);

  return {
    required: missing.filter((gap) => gap.importance === "Required"),
    preferred: missing.filter((gap) => gap.importance === "Preferred"),
    other: missing.filter((gap) => gap.importance === "Industry"),
  };
}

export function getHardConstraintRisks(analysis: AtsAnalysisResult | null): HardConstraintRisk[] {
  if (!analysis) {
    return [];
  }

  const risks = analysis.hard_constraint_risks ?? [];
  const riskRequirements = new Set(
    risks.map((risk) => normalizeRequirementText(risk.requirement)),
  );
  const fallbackRisks = (analysis.requirement_reviews ?? [])
    .filter(
      (review) =>
        review.hard_constraint &&
        review.importance === "Required" &&
        (
          review.match_state === "Missing" ||
          review.match_state === "Partial" ||
          review.match_state === "Implied"
        ) &&
        !riskRequirements.has(normalizeRequirementText(review.keyword)),
    )
    .map((review) => ({
      requirement: review.keyword,
      category: inferHardConstraintCategory(review.keyword),
      score_cap: 0,
      reason: "A required hard constraint was not clearly confirmed in the resume.",
      action:
        review.recommendation.trim() ||
        "Check this requirement before tailoring. If it is not true for you, do not claim it.",
    }));

  return [...risks, ...fallbackRisks];
}

function normalizeRequirementText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function inferHardConstraintCategory(keyword: string): HardConstraintRisk["category"] {
  const lower = normalizeRequirementText(keyword);

  if (
    lower.includes("citizen") ||
    lower.includes("citizenship")
  ) {
    return "Citizenship";
  }
  if (
    lower.includes("work authorization") ||
    lower.includes("authorized to work") ||
    lower.includes("visa")
  ) {
    return "WorkAuthorization";
  }
  if (lower.includes("clearance")) {
    return "SecurityClearance";
  }
  if (
    lower.includes("license") ||
    lower.includes("certification") ||
    lower === "cdl" ||
    lower === "cna" ||
    lower === "rn"
  ) {
    return "LicenseOrCertification";
  }
  if (
    lower.includes("degree") ||
    lower.includes("bachelor") ||
    lower.includes("master") ||
    lower.includes("high school") ||
    lower === "ged"
  ) {
    return "Education";
  }
  if (lower.includes("language") || lower.includes("bilingual") || lower.includes("fluency")) {
    return "Language";
  }
  if (
    lower.includes("years of age") ||
    lower.includes("year of age") ||
    lower.includes("years old") ||
    lower.includes("year old") ||
    lower.includes("minimum age") ||
    lower.includes("age requirement") ||
    lower.includes("legal work age")
  ) {
    return "Age";
  }
  if (lower.includes("background") || lower.includes("drug") || lower.includes("screening")) {
    return "BackgroundScreening";
  }
  if (lower.includes("lift") || lower.includes("pound") || lower.includes("physical")) {
    return "PhysicalRequirement";
  }
  if (
    lower.includes("onsite") ||
    lower.includes("remote") ||
    lower.includes("hybrid") ||
    lower.includes("travel") ||
    lower.includes("schedule") ||
    lower.includes("availability")
  ) {
    return "Location";
  }

  return "Experience";
}
