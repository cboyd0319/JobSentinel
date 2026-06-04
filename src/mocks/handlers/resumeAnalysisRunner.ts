import {
  type MockAtsAnalysisResult,
  type MockAtsKeyword,
  type MockAtsSuggestion,
  type MockFormatIssue,
  type MockKeywordMatch,
} from "./resumeAnalysis";
import {
  getMockAtsResumeSections,
  getNestedString,
  hasMockAdversarialResumeText,
  hasMockGenericFillerBullet,
  hasMockKeywordListBullet,
  hasMockUnclearCapabilityLevel,
} from "./resumeAnalysisSections";
import {
  countMockEvidenceFrequency,
  extractMockAtsKeywords,
  findMockKeywordLocations,
} from "./resumeKeywordMatching";
import {
  buildMockHardConstraintRisks,
  buildMockRequirementReviews,
} from "./resumeRequirementReview";

export function analyzeMockResumeFormat(resume: unknown): MockAtsAnalysisResult {
  const sections = getMockAtsResumeSections(resume);
  const formatIssues: MockFormatIssue[] = [];
  const suggestions: MockAtsSuggestion[] = [];

  if (!getNestedString(resume, ["contact_info", "email"])) {
    formatIssues.push({
      severity: "Critical",
      issue: "Missing email address",
      fix: "Add your professional email address",
    });
  }
  if (sections.experience.length === 0) {
    formatIssues.push({
      severity: "Warning",
      issue: "Missing experience section",
      fix: "Add recent roles with quantified achievements",
    });
    suggestions.push({
      category: "AddSection",
      suggestion: "Add work experience with measurable impact",
      impact: "Makes your work evidence easier to compare in one place.",
    });
  }
  if (sections.skills.length === 0) {
    formatIssues.push({
      severity: "Warning",
      issue: "Missing skills section",
      fix: "Add relevant role-specific, workplace, and transferable skills",
    });
  }
  if (hasMockAdversarialResumeText(sections.allText)) {
    formatIssues.push({
      severity: "Warning",
      issue: "Instruction-like or hidden resume text detected",
      fix: "Remove instructions aimed at screening tools and keep only truthful qualifications, work evidence, and readable application content.",
    });
    suggestions.push({
      category: "FormatFix",
      suggestion:
        "Review the resume for prompt-injection-like instructions, hidden text, or invisible characters before using it.",
      impact:
        "Keeps the resume readable and avoids tactics that can backfire with employers or screening systems.",
    });
  }
  if (hasMockKeywordListBullet(sections)) {
    formatIssues.push({
      severity: "Warning",
      issue: "Experience bullet reads like a keyword list",
      fix: "Rewrite it as a plain work example with your role, action, tools, and result.",
    });
    suggestions.push({
      category: "FormatFix",
      suggestion: "Turn keyword-list bullets into readable work evidence you can explain.",
      impact: "Keeps strong terms useful without making the resume look machine-written.",
    });
  }
  if (hasMockUnclearCapabilityLevel(sections)) {
    formatIssues.push({
      severity: "Warning",
      issue: "Capability level needs review",
      fix: "Confirm whether this was exposure, assisted work, independent delivery, ownership, or expert work, then keep the wording at that true level.",
    });
    suggestions.push({
      category: "FormatFix",
      suggestion: "Match the bullet to the true level of responsibility before strengthening it.",
      impact:
        "Prevents overstating experience while still making real hands-on work visible.",
    });
  }
  if (hasMockGenericFillerBullet(sections)) {
    formatIssues.push({
      severity: "Warning",
      issue: "Experience bullet reads like generic resume filler",
      fix: "Replace generic buzzwords with specific work evidence: what you did, who it helped, and what changed.",
    });
    suggestions.push({
      category: "FormatFix",
      suggestion: "Replace generic filler with specific work evidence you can explain.",
      impact: "Makes the bullet easier for people to evaluate without overstating the claim.",
    });
  }

  const formatScore = clampScore(100 - formatIssues.length * 10);
  const completenessScore = clampScore(
    40 +
      (sections.summary ? 15 : 0) +
      Math.min(sections.experience.length, 3) * 10 +
      Math.min(sections.skills.length, 6) * 3,
  );

  return {
    overall_score: Math.round((formatScore * 0.5 + completenessScore * 0.5) * 10) / 10,
    keyword_score: 0,
    format_score: formatScore,
    completeness_score: completenessScore,
    keyword_matches: [],
    missing_keywords: [],
    missing_keyword_details: [],
    requirement_reviews: [],
    hard_constraint_risks: [],
    format_issues: formatIssues,
    suggestions,
  };
}

export function analyzeMockResumeForJob(
  resume: unknown,
  jobDescription: string,
): MockAtsAnalysisResult {
  const formatResult = analyzeMockResumeFormat(resume);
  const sections = getMockAtsResumeSections(resume);
  const keywords = extractMockAtsKeywords(jobDescription);
  const keywordMatches: MockKeywordMatch[] = [];
  const missingKeywordDetails: MockAtsKeyword[] = [];

  for (const { keyword, importance } of keywords) {
    const foundIn = findMockKeywordLocations(sections, keyword);
    if (foundIn.length > 0) {
      keywordMatches.push({
        keyword,
        found_in: foundIn,
        frequency: countMockEvidenceFrequency(sections, keyword),
        importance,
      });
    } else {
      missingKeywordDetails.push({ keyword, importance });
    }
  }

  const missingKeywords = missingKeywordDetails.map(({ keyword }) => keyword);
  const keywordScore = keywords.length > 0
    ? Math.round((keywordMatches.length / keywords.length) * 1000) / 10
    : 0;
  const requirementReviews = buildMockRequirementReviews(
    keywords,
    keywordMatches,
    missingKeywordDetails,
  );
  const hardConstraintRisks = buildMockHardConstraintRisks(requirementReviews);
  const scoreCap = hardConstraintRisks.reduce<number | undefined>(
    (current, risk) =>
      current === undefined ? risk.score_cap : Math.min(current, risk.score_cap),
    undefined,
  );
  const suggestions: MockAtsSuggestion[] = [
    ...formatResult.suggestions,
    ...missingKeywordDetails.map(({ keyword, importance }) => {
      const impact = importance === "Required"
        ? "Required job-post language is easier to compare when real evidence is visible."
        : importance === "Preferred"
          ? "Preferred job-post language can help when it honestly fits your background."
          : "Role language can improve clarity when it accurately describes your work.";

      return {
        category: "AddKeyword" as const,
        suggestion: `Review whether '${keyword}' is true for your background and worth making visible`,
        impact,
      };
    }),
  ];
  const uncappedOverallScore = Math.round(
    (keywordScore * 0.4 + formatResult.format_score * 0.3 + formatResult.completeness_score * 0.3) * 10,
  ) / 10;

  return {
    ...formatResult,
    overall_score: scoreCap === undefined
      ? uncappedOverallScore
      : Math.min(uncappedOverallScore, scoreCap),
    keyword_score: keywordScore,
    keyword_matches: keywordMatches,
    missing_keywords: missingKeywords,
    missing_keyword_details: missingKeywordDetails,
    requirement_reviews: requirementReviews,
    hard_constraint_risks: hardConstraintRisks,
    suggestions,
  };
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}
