import { getUserFriendlyError } from "../../../utils/errorMessages";
import type {
  IssueSeverity,
  RequirementMatchState,
  HardConstraintCategory,
  SuggestionCategory,
  RequirementReview,
  FormatIssue,
  AtsAnalysisResult,
  ResumeNextAction,
  ResumeFitEvidenceStatus,
  ResumeSummary,
} from "./resumeMatchContracts";

export type {
  ContactInfo,
  Experience,
  Education,
  Skill,
  AtsResumeData,
  KeywordImportance,
  IssueSeverity,
  RequirementMatchState,
  HardConstraintCategory,
  SuggestionCategory,
  KeywordMatch,
  MissingKeyword,
  RequirementReview,
  HardConstraintRisk,
  FormatIssue,
  AtsSuggestion,
  AtsAnalysisResult,
  ResumeNextAction,
  ResumeFitEvidenceStatus,
  ResumeSummary,
} from "./resumeMatchContracts";

export { isResumeSummary, parseAtsResumeInput } from "./resumeMatchValidation";

export function formatSuggestionCategory(category: SuggestionCategory): string {
  switch (category) {
    case "AddKeyword":
      return "Review job words";
    case "RewordBullet":
      return "Rewrite bullet";
    case "AddSection":
      return "Add section";
    case "ReorderContent":
      return "Reorder content";
    case "FormatFix":
      return "Safety check";
  }
}
export function formatIssueSeverity(severity: IssueSeverity): string {
  switch (severity) {
    case "Critical":
      return "Fix first";
    case "Warning":
      return "Review";
    case "Info":
      return "Note";
  }
}

export function formatRequirementState(state: RequirementMatchState): string {
  switch (state) {
    case "Strong":
      return "Strong evidence";
    case "Direct":
      return "Visible evidence";
    case "Partial":
      return "Needs support";
    case "Implied":
      return "Check wording";
    case "Missing":
      return "Not found";
  }
}

function formatRequirementEvidenceSection(section: string): string {
  switch (section) {
    case "current experience":
      return "current role experience";
    case "recent experience":
      return "recent role experience";
    case "experience":
      return "work experience";
    case "skills":
      return "skills list";
    case "summary":
      return "resume summary";
    case "resume text":
      return "resume text";
    case "projects":
      return "projects";
    case "education":
      return "education";
    case "certifications":
      return "certifications";
    case "licenses":
      return "licenses";
    default:
      return section.replace(/[_-]/g, " ");
  }
}

export function formatRequirementEvidenceSections(sections: string[]): string {
  return sections.map(formatRequirementEvidenceSection).join(", ");
}

export function formatHardConstraintCategory(category: HardConstraintCategory): string {
  switch (category) {
    case "WorkAuthorization":
      return "Work authorization";
    case "Citizenship":
      return "Citizenship";
    case "SecurityClearance":
      return "Security clearance";
    case "LicenseOrCertification":
      return "License or certification";
    case "Education":
      return "Education";
    case "Experience":
      return "Years of experience";
    case "Language":
      return "Language requirement";
    case "Age":
      return "Age requirement";
    case "BackgroundScreening":
      return "Background or drug screening";
    case "PhysicalRequirement":
      return "Physical requirement";
    case "Location":
      return "Location, schedule, availability, or travel";
  }
}

function isCitizenshipRequirement(requirement: string): boolean {
  const lower = requirement.toLowerCase();
  return (
    lower.includes("us citizenship") ||
    lower.includes("u.s. citizenship") ||
    lower.includes("us citizen") ||
    lower.includes("u.s. citizen") ||
    lower.includes("citizenship required")
  );
}

export function formatHardConstraintNextActionDetail(
  category: HardConstraintCategory,
  requirement = "",
): string {
  if (
    category === "Citizenship" ||
    (category === "WorkAuthorization" && isCitizenshipRequirement(requirement))
  ) {
    return "If the citizenship requirement is not true for you, do not claim it. Do not treat work authorization as citizenship.";
  }

  switch (category) {
    case "WorkAuthorization":
      return "If the authorization is not true for you, do not claim it. Check the posting before tailoring.";
    case "SecurityClearance":
      return "If the clearance is not current or true for you, do not claim it. Check this before tailoring.";
    case "LicenseOrCertification":
      return "If the license or certification is not current or true for you, do not claim it. Check this before tailoring.";
    case "Education":
      return "If the degree or education requirement is not true for you, do not claim it. Check this before tailoring.";
    case "Experience":
      return "If the years are not true for you, do not round up or imply more experience. Use only real dates, roles, or projects.";
    case "Language":
      return "If language fluency is not true for you, do not claim it. Use only real language ability, training, or credentials.";
    case "Age":
      return "If the minimum-age or legal work-age requirement is not true for you, do not claim it. Check this before tailoring.";
    case "BackgroundScreening":
      return "If background, drug, or pre-employment screening is not workable or true for you, check it before spending tailoring time.";
    case "PhysicalRequirement":
      return "If this physical demand is not workable or safe for you, check it before spending tailoring time.";
    case "Location":
      return "If the location, schedule, availability, or travel requirement is not workable, check it before spending tailoring time.";
  }
}

export function getSelectedResumeReadableStatus(resume: ResumeSummary): string {
  if (resume.has_readable_text === true) {
    const chars = typeof resume.readable_text_chars === "number"
      ? resume.readable_text_chars
      : 0;
    if (chars > 0) {
      return `${chars.toLocaleString()} readable characters for local review.`;
    }
    return "Readable text available for local review.";
  }

  if (resume.has_readable_text === false) {
    return "No readable text found. Follow employer file instructions first, then choose a readable PDF, DOCX, TXT, Markdown, or HTML resume.";
  }

  return "Open Resumes to preview what JobSentinel can read.";
}

export function getResumeFitEvidenceStatus(analysis: AtsAnalysisResult): ResumeFitEvidenceStatus {
  const hardConstraintRisks = analysis.hard_constraint_risks ?? [];
  const requirementReviews = analysis.requirement_reviews ?? [];
  const keywordMatches = analysis.keyword_matches ?? [];
  const missingKeywordDetails = analysis.missing_keyword_details ?? [];

  const hardConstraintReviewRisk = requirementReviews.some(
    (review) => review.hard_constraint && isMissingOrWeakRequiredReview(review),
  );

  if (hardConstraintRisks.length > 0 || hardConstraintReviewRisk) {
    return {
      label: "Check must-haves first",
      detail: "A required item needs verification before tailoring.",
      variant: "danger",
    };
  }

  const missingOrWeakRequired = requirementReviews.some(isMissingOrWeakRequiredReview);
  if (missingOrWeakRequired) {
    return {
      label: "Mixed evidence",
      detail: "Some required job-post language is missing or needs clearer support.",
      variant: "alert",
    };
  }

  if (
    requirementReviews.length === 0 &&
    keywordMatches.length === 0 &&
    missingKeywordDetails.length === 0
  ) {
    return {
      label: "Not enough job detail",
      detail: "The job post did not include enough recognized requirements for a confident fit review.",
      variant: "alert",
    };
  }

  return {
    label: "Clearer evidence",
    detail: "Visible resume evidence lines up with the recognized job-post details.",
    variant: "success",
  };
}

function findThinJobPostIssue(analysis: AtsAnalysisResult): FormatIssue | undefined {
  return analysis.format_issues.find((issue) => {
    const issueText = issue.issue.toLowerCase();
    const fixText = issue.fix.toLowerCase();
    return (
      issueText.includes("not enough job-post detail") ||
      fixText.includes("paste a fuller job post")
    );
  });
}

function normalizeRequirementText(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function isMissingOrWeakRequiredReview(review: RequirementReview): boolean {
  return (
    review.importance === "Required" &&
    (
      review.match_state === "Missing" ||
      review.match_state === "Partial" ||
      review.match_state === "Implied"
    )
  );
}

export function buildResumeNextActions(analysis: AtsAnalysisResult): ResumeNextAction[] {
  const actions: ResumeNextAction[] = [];
  const hardRisks = analysis.hard_constraint_risks ?? [];
  const reviews = analysis.requirement_reviews ?? [];
  const hardRiskRequirements = new Set(
    hardRisks.map((risk) => normalizeRequirementText(risk.requirement)),
  );

  for (const risk of hardRisks.slice(0, 5)) {
    actions.push({
      title: `Check ${risk.requirement} before tailoring`,
      detail: risk.action.trim() || formatHardConstraintNextActionDetail(
        risk.category,
        risk.requirement,
      ),
      variant: "danger",
      label: "Check first",
    });
  }

  if (actions.length >= 5) {
    return actions;
  }

  const hardConstraintReviews = reviews.filter(
    (review) =>
      review.hard_constraint &&
      isMissingOrWeakRequiredReview(review) &&
      !hardRiskRequirements.has(normalizeRequirementText(review.keyword)),
  );
  for (const review of hardConstraintReviews.slice(0, 5 - actions.length)) {
    actions.push({
      title: `Check ${review.keyword} before tailoring`,
      detail: "This is marked as a hard requirement. Only rely on it if it is true and supported by real evidence.",
      variant: "danger",
      label: "Check first",
    });
  }

  if (actions.length >= 5) {
    return actions;
  }

  const missingRequired = reviews.filter(
    (review) =>
      isMissingOrWeakRequiredReview(review) &&
      review.match_state === "Missing" &&
      !review.hard_constraint,
  );
  for (const review of missingRequired.slice(0, 5 - actions.length)) {
    actions.push({
      title: `Review required evidence for ${review.keyword}`,
      detail: "Only add it if it is true and you can explain it from real work, training, or credentials.",
      variant: "alert",
      label: "Review",
    });
  }

  if (actions.length >= 5) {
    return actions;
  }

  const partialRequired = reviews.filter(
    (review) =>
      isMissingOrWeakRequiredReview(review) &&
      (review.match_state === "Partial" || review.match_state === "Implied") &&
      !review.hard_constraint &&
      !hardRiskRequirements.has(normalizeRequirementText(review.keyword)),
  );
  for (const review of partialRequired.slice(0, 5 - actions.length)) {
    actions.push({
      title: `Add supporting evidence for ${review.keyword} only if true`,
      detail: "A skills list is weaker than a role, project, credential, or outcome that shows how you used it.",
      variant: "alert",
      label: "Needs support",
    });
  }

  if (actions.length >= 5) {
    return actions;
  }

  if (hardRisks.length === 0 && actions.length === 0) {
    const visibleRequired = reviews.find(
      (review) =>
        review.importance === "Required" &&
        (review.match_state === "Direct" || review.match_state === "Strong"),
    );
    if (visibleRequired) {
      actions.push({
        title: `Keep ${visibleRequired.keyword} visible`,
        detail: "This is useful evidence. Keep it easy to find near the role, project, or credential where it is true.",
        variant: "success",
        label: "Useful evidence",
      });
    }
  }

  if (actions.length === 0 && analysis.keyword_matches.length > 0) {
    actions.push({
      title: "Tailor carefully from real evidence",
      detail: "Use the matching words below to decide what deserves a clearer bullet or stronger placement.",
      variant: "sentinel",
      label: "Next step",
    });
  }

  const thinJobPostIssue = findThinJobPostIssue(analysis);
  if (actions.length === 0 && thinJobPostIssue) {
    actions.push({
      title: "Paste fuller job post",
      detail: thinJobPostIssue.fix,
      variant: "alert",
      label: "Add detail",
    });
  }

  if (actions.length === 0 && analysis.format_issues.length > 0) {
    actions.push({
      title: "Fix readability details first",
      detail: "A clear resume is easier for people and application systems to read before any job-specific edits.",
      variant: "alert",
      label: "Fix first",
    });
  }

  return actions.slice(0, 5);
}

export function getResumeAnalysisErrorAction(error: unknown): string {
  const friendly = getUserFriendlyError(error);
  return friendly.action ?? friendly.message;
}
