export type KeywordImportance = "Required" | "Preferred" | "Industry";
export type IssueSeverity = "Critical" | "Warning" | "Info";
export type RequirementMatchState = "Direct" | "Strong" | "Partial" | "Implied" | "Missing";
export type HardConstraintCategory =
  | "WorkAuthorization"
  | "Citizenship"
  | "SecurityClearance"
  | "LicenseOrCertification"
  | "Education"
  | "Experience"
  | "Language"
  | "Age"
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
