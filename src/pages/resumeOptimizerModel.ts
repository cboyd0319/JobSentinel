import { getUserFriendlyError } from "../utils/errorMessages";

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string | null;
  github: string | null;
  website: string | null;
}

export interface Experience {
  title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string;
  achievements: string[];
  current: boolean;
}

export interface Education {
  degree: string;
  institution: string;
  location: string;
  graduation_date: string;
  gpa: number | null;
  honors: string[];
}

export interface Skill {
  name: string;
  category: string;
  proficiency: string | null;
}

export interface AtsResumeData {
  contact_info: ContactInfo;
  summary: string;
  experience: Experience[];
  skills: Skill[];
  education: Education[];
  certifications: string[];
  projects: string[];
  custom_sections: Record<string, string[]>;
}

export type KeywordImportance = "Required" | "Preferred" | "Industry";
export type IssueSeverity = "Critical" | "Warning" | "Info";
export type RequirementMatchState = "Direct" | "Strong" | "Partial" | "Implied" | "Missing";
export type HardConstraintCategory =
  | "WorkAuthorization"
  | "SecurityClearance"
  | "LicenseOrCertification"
  | "Education"
  | "Experience"
  | "Language"
  | "BackgroundScreening"
  | "PhysicalRequirement"
  | "Location";
export type SuggestionCategory =
  | "AddKeyword"
  | "RewordBullet"
  | "AddSection"
  | "ReorderContent"
  | "FormatFix";

export interface KeywordMatch {
  keyword: string;
  importance: KeywordImportance;
  found_in: string[];
  frequency: number;
}

export interface MissingKeyword {
  keyword: string;
  importance: KeywordImportance;
}

export interface RequirementReview {
  keyword: string;
  importance: KeywordImportance;
  match_state: RequirementMatchState;
  evidence_sections: string[];
  hard_constraint: boolean;
  recommendation: string;
}

export interface HardConstraintRisk {
  requirement: string;
  category: HardConstraintCategory;
  score_cap: number;
  reason: string;
  action: string;
}

export interface FormatIssue {
  severity: IssueSeverity;
  issue: string;
  fix: string;
}

export interface AtsSuggestion {
  category: SuggestionCategory;
  suggestion: string;
  impact: string;
}

export interface AtsAnalysisResult {
  overall_score: number;
  keyword_score: number;
  format_score: number;
  completeness_score: number;
  keyword_matches: KeywordMatch[];
  missing_keywords: string[];
  missing_keyword_details?: MissingKeyword[];
  requirement_reviews?: RequirementReview[];
  hard_constraint_risks?: HardConstraintRisk[];
  format_issues: FormatIssue[];
  suggestions: AtsSuggestion[];
}

export interface ResumeNextAction {
  title: string;
  detail: string;
  variant: "danger" | "alert" | "success" | "sentinel" | "surface";
  label: string;
}

export interface ResumeFitEvidenceStatus {
  label: string;
  detail: string;
  variant: "danger" | "alert" | "success" | "sentinel" | "surface";
}

export interface ResumeSummary {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  format_label?: string;
  has_readable_text?: boolean;
  readable_text_chars?: number;
}

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
    case "BackgroundScreening":
      return "Background or drug screening";
    case "PhysicalRequirement":
      return "Physical requirement";
    case "Location":
      return "Location, schedule, availability, or travel";
  }
}

export function formatHardConstraintNextActionDetail(category: HardConstraintCategory): string {
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
    case "BackgroundScreening":
      return "If background, drug, or pre-employment screening is not workable or true for you, check it before spending tailoring time.";
    case "PhysicalRequirement":
      return "If this physical demand is not workable or safe for you, check it before spending tailoring time.";
    case "Location":
      return "If the location, schedule, availability, or travel requirement is not workable, check it before spending tailoring time.";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isContactInfo(value: unknown): value is ContactInfo {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.phone === "string" &&
    typeof value.location === "string" &&
    isNullableString(value.linkedin) &&
    isNullableString(value.github) &&
    isNullableString(value.website)
  );
}

function isExperience(value: unknown): value is Experience {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    typeof value.company === "string" &&
    typeof value.location === "string" &&
    typeof value.start_date === "string" &&
    typeof value.end_date === "string" &&
    isStringArray(value.achievements) &&
    typeof value.current === "boolean"
  );
}

function isEducation(value: unknown): value is Education {
  return (
    isRecord(value) &&
    typeof value.degree === "string" &&
    typeof value.institution === "string" &&
    typeof value.location === "string" &&
    typeof value.graduation_date === "string" &&
    (value.gpa === null || (typeof value.gpa === "number" && Number.isFinite(value.gpa))) &&
    isStringArray(value.honors)
  );
}

function isSkill(value: unknown): value is Skill {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.category === "string" &&
    isNullableString(value.proficiency)
  );
}

function isCustomSections(value: unknown): value is Record<string, string[]> {
  return isRecord(value) && Object.values(value).every(isStringArray);
}

function isAtsResumeData(value: unknown): value is AtsResumeData {
  return (
    isRecord(value) &&
    isContactInfo(value.contact_info) &&
    typeof value.summary === "string" &&
    Array.isArray(value.experience) &&
    value.experience.every(isExperience) &&
    Array.isArray(value.skills) &&
    value.skills.every(isSkill) &&
    Array.isArray(value.education) &&
    value.education.every(isEducation) &&
    isStringArray(value.certifications) &&
    isStringArray(value.projects) &&
    isCustomSections(value.custom_sections)
  );
}

export function isResumeSummary(value: unknown): value is ResumeSummary {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "number" &&
    typeof value.name === "string" &&
    typeof value.is_active === "boolean" &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string" &&
    (value.format_label === undefined || typeof value.format_label === "string") &&
    (value.has_readable_text === undefined || typeof value.has_readable_text === "boolean") &&
    (
      value.readable_text_chars === undefined ||
      (typeof value.readable_text_chars === "number" && Number.isFinite(value.readable_text_chars))
    )
  );
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
    return "No readable text found. Follow employer file instructions first, then choose a readable PDF, DOCX, TXT, or Markdown resume.";
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
      detail: risk.action.trim() || formatHardConstraintNextActionDetail(risk.category),
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

export function parseAtsResumeInput(value: string): AtsResumeData | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return isAtsResumeData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getResumeAnalysisErrorAction(error: unknown): string {
  const friendly = getUserFriendlyError(error);
  return friendly.action ?? friendly.message;
}
